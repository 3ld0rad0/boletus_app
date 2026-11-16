package it.boletus.app;

import android.Manifest;
import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.SystemClock;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONObject;

/**
 * Passi e direzione di cammino per stimare il percorso senza GPS.
 * A differenza dei plugin pubblici non sospende i sensori quando l'app va in secondo piano:
 * resta attivo finché dura il servizio in primo piano della geolocalizzazione.
 * Emette "steps" ogni pochi passi con la direzione media (nord magnetico) e la rotazione
 * attorno alla verticale dall'evento precedente ("yawDelta", gradi in senso orario): quest'ultima
 * non dipende da come è tenuto il telefono, nemmeno in tasca.
 */
@CapacitorPlugin(
    name = "PdrMotion",
    permissions = { @Permission(strings = { Manifest.permission.ACTIVITY_RECOGNITION }, alias = "activityRecognition") }
)
public class PdrMotionPlugin extends Plugin implements SensorEventListener {

    private static final int FLUSH_STEPS = 5;
    private static final long FLUSH_MS = 4000;
    // Sopra questa componente verticale dell'asse Z il telefono è considerato piatto.
    private static final float FLAT_THRESHOLD = 0.7f;

    private SensorManager sensorManager;
    private Sensor stepDetector;
    private Sensor rotationVector;
    private Sensor gameRotationVector;
    private HandlerThread thread;
    private boolean running = false;

    private final float[] matrix = new float[9];
    private final float[] yawMatrix = new float[9];
    private final float[] previousYawMatrix = new float[9];
    private boolean hasPreviousYaw = false;
    private double yawSumRad = 0;
    private boolean hasHeading = false;
    private double headingSin = 0;
    private double headingCos = 0;

    private int steps = 0;
    private int headedSteps = 0;
    private double sumSin = 0;
    private double sumCos = 0;
    private long firstStepAt = 0;

    @Override
    public void load() {
        sensorManager = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        stepDetector = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR);
        rotationVector = sensorManager.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
        gameRotationVector = sensorManager.getDefaultSensor(Sensor.TYPE_GAME_ROTATION_VECTOR);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (stepDetector == null) {
            call.reject("Step detector not available", "UNAVAILABLE");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && getPermissionState("activityRecognition") != PermissionState.GRANTED) {
            requestPermissionForAlias("activityRecognition", call, "permissionCallback");
            return;
        }
        begin(call);
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        if (getPermissionState("activityRecognition") == PermissionState.GRANTED) begin(call);
        else call.reject("Activity recognition permission denied", "PERMISSION_DENIED");
    }

    private synchronized void begin(PluginCall call) {
        if (running) {
            call.resolve();
            return;
        }
        thread = new HandlerThread("pdr-motion");
        thread.start();
        Handler handler = new Handler(thread.getLooper());
        resetBatch();
        hasHeading = false;
        hasPreviousYaw = false;
        yawSumRad = 0;
        boolean ok = sensorManager.registerListener(this, stepDetector, SensorManager.SENSOR_DELAY_NORMAL, handler);
        // Senza sensore di rotazione i passi arrivano comunque, ma senza direzione.
        if (ok && rotationVector != null) {
            sensorManager.registerListener(this, rotationVector, SensorManager.SENSOR_DELAY_UI, handler);
        }
        // Rotazione solo da giroscopio (niente magnetometro): immune ai disturbi magnetici.
        if (ok && gameRotationVector != null) {
            sensorManager.registerListener(this, gameRotationVector, SensorManager.SENSOR_DELAY_UI, handler);
        }
        if (!ok) {
            thread.quitSafely();
            thread = null;
            call.reject("Failed to register step detector", "UNAVAILABLE");
            return;
        }
        running = true;
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        halt();
        call.resolve();
    }

    private synchronized void halt() {
        if (!running) return;
        running = false;
        sensorManager.unregisterListener(this);
        if (thread != null) {
            thread.quitSafely();
            thread = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        halt();
        super.handleOnDestroy();
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_ROTATION_VECTOR) {
            updateHeading(event.values);
            if (gameRotationVector == null) updateYaw(event.values);
        } else if (event.sensor.getType() == Sensor.TYPE_GAME_ROTATION_VECTOR) {
            updateYaw(event.values);
        } else if (event.sensor.getType() == Sensor.TYPE_STEP_DETECTOR) {
            onStep();
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    /** Direzione in cui si cammina: con telefono piatto è la sua cima, in verticale è dove punta la fotocamera. */
    private void updateHeading(float[] rotationValues) {
        SensorManager.getRotationMatrixFromVector(matrix, rotationValues);
        double east;
        double north;
        if (Math.abs(matrix[8]) > FLAT_THRESHOLD) {
            east = matrix[1];
            north = matrix[4];
        } else {
            east = -matrix[2];
            north = -matrix[5];
        }
        double norm = Math.hypot(east, north);
        if (norm < 1e-3) return;
        headingSin = east / norm;
        headingCos = north / norm;
        hasHeading = true;
    }

    /** Accumula la rotazione attorno alla verticale: componente z della rotazione tra due letture, nel sistema del mondo. */
    private void updateYaw(float[] rotationValues) {
        SensorManager.getRotationMatrixFromVector(yawMatrix, rotationValues);
        if (hasPreviousYaw) {
            float[] n = yawMatrix;
            float[] o = previousYawMatrix;
            // D = N * O^T; per rotazioni piccole la rotazione attorno a z è (D10 - D01) / 2.
            double d10 = n[3] * o[0] + n[4] * o[1] + n[5] * o[2];
            double d01 = n[0] * o[3] + n[1] * o[4] + n[2] * o[5];
            // Antioraria vista dall'alto: la direzione (oraria) diminuisce.
            yawSumRad -= 0.5 * (d10 - d01);
        }
        System.arraycopy(yawMatrix, 0, previousYawMatrix, 0, 9);
        hasPreviousYaw = true;
    }

    private void onStep() {
        long now = SystemClock.elapsedRealtime();
        if (steps == 0) firstStepAt = now;
        steps++;
        if (hasHeading) {
            headedSteps++;
            sumSin += headingSin;
            sumCos += headingCos;
        }
        if (steps >= FLUSH_STEPS || now - firstStepAt >= FLUSH_MS) flush();
    }

    private void flush() {
        if (steps == 0) return;
        JSObject event = new JSObject();
        event.put("steps", steps);
        if (headedSteps > 0) {
            double deg = Math.toDegrees(Math.atan2(sumSin, sumCos));
            event.put("heading", (deg + 360) % 360);
        } else {
            event.put("heading", JSONObject.NULL);
        }
        event.put("trueNorth", false);
        event.put("yawDelta", Math.toDegrees(yawSumRad));
        yawSumRad = 0;
        resetBatch();
        notifyListeners("steps", event);
    }

    private void resetBatch() {
        steps = 0;
        headedSteps = 0;
        sumSin = 0;
        sumCos = 0;
    }
}
