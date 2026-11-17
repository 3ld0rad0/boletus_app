import Capacitor
import CoreMotion

/// Passi e direzione di cammino per stimare il percorso senza GPS.
/// Resta attivo in background finché l'app è tenuta viva dalla geolocalizzazione.
/// Emette "steps" a ogni aggiornamento del contapassi, con la direzione media (nord reale) e la rotazione
/// attorno alla verticale dall'evento precedente ("yawDelta", gradi in senso orario), che non dipende
/// da come è tenuto il telefono.
@objc(PdrMotionPlugin)
public class PdrMotionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PdrMotionPlugin"
    public let jsName = "PdrMotion"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]

    // Sopra questa componente verticale dell'asse Z il telefono è considerato piatto.
    private let flatThreshold = 0.7

    private let pedometer = CMPedometer()
    private let motion = CMMotionManager()
    private let queue = DispatchQueue(label: "it.boletus.pdr")
    private let motionQueue = OperationQueue()
    private var running = false

    // Accessi solo da `queue`.
    private var lastSteps = 0
    private var headingCount = 0
    private var sumSin = 0.0
    private var sumCos = 0.0
    private var yawSumDeg = 0.0
    private var lastMotionTime: TimeInterval?

    @objc func start(_ call: CAPPluginCall) {
        guard CMPedometer.isStepCountingAvailable() else {
            call.reject("Step counting not available", "UNAVAILABLE")
            return
        }
        let status = CMPedometer.authorizationStatus()
        if status == .denied || status == .restricted {
            call.reject("Motion permission denied", "PERMISSION_DENIED")
            return
        }
        queue.async { [self] in
            if running { return }
            running = true
            lastSteps = 0
            lastMotionTime = nil
            yawSumDeg = 0
            resetHeading()
            pedometer.startUpdates(from: Date()) { [weak self] data, _ in
                guard let self, let data else { return }
                self.queue.async { self.onPedometer(total: data.numberOfSteps.intValue) }
            }
            startHeading()
        }
        call.resolve()
    }

    @objc func stop(_ call: CAPPluginCall) {
        queue.async { [self] in
            guard running else { return }
            running = false
            pedometer.stopUpdates()
            motion.stopDeviceMotionUpdates()
        }
        call.resolve()
    }

    private func startHeading() {
        let frame = CMAttitudeReferenceFrame.xTrueNorthZVertical
        guard motion.isDeviceMotionAvailable,
              CMMotionManager.availableAttitudeReferenceFrames().contains(frame) else { return }
        motionQueue.maxConcurrentOperationCount = 1
        motion.deviceMotionUpdateInterval = 0.05
        motion.startDeviceMotionUpdates(using: frame, to: motionQueue) { [weak self] data, _ in
            guard let self, let data else { return }
            let m = data.attitude.rotationMatrix
            let rate = data.rotationRate
            let g = data.gravity
            let time = data.timestamp
            // Il sistema di riferimento ha X a nord e Y a ovest; `m` porta i vettori dal riferimento al dispositivo.
            // Con telefono piatto si cammina verso la sua cima (asse Y), in verticale verso la fotocamera (-Z).
            let east: Double
            let north: Double
            if abs(m.m33) > self.flatThreshold {
                north = m.m21
                east = -m.m22
            } else {
                north = -m.m31
                east = m.m32
            }
            let norm = hypot(east, north)
            self.queue.async {
                // Velocità di rotazione attorno alla verticale (oraria = positiva): ω · g / |g|.
                let gNorm = (g.x * g.x + g.y * g.y + g.z * g.z).squareRoot()
                if let last = self.lastMotionTime, gNorm > 0.5 {
                    let rateDeg = (rate.x * g.x + rate.y * g.y + rate.z * g.z) / gNorm * 180 / .pi
                    self.yawSumDeg += rateDeg * (time - last)
                }
                self.lastMotionTime = time
                if norm < 1e-3 { return }
                self.sumSin += east / norm
                self.sumCos += north / norm
                self.headingCount += 1
            }
        }
    }

    private func onPedometer(total: Int) {
        let delta = total - lastSteps
        lastSteps = total
        if delta <= 0 { return }
        var heading: Any = NSNull()
        if headingCount > 0 {
            let deg = atan2(sumSin, sumCos) * 180 / .pi
            heading = (deg + 360).truncatingRemainder(dividingBy: 360)
        }
        resetHeading()
        let yaw = yawSumDeg
        yawSumDeg = 0
        notifyListeners("steps", data: ["steps": delta, "heading": heading, "yawDelta": yaw, "trueNorth": true])
    }

    private func resetHeading() {
        headingCount = 0
        sumSin = 0
        sumCos = 0
    }
}
