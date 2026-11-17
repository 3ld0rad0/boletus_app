import Capacitor

/// Registra i plugin locali dell'app (non distribuiti come pacchetti).
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(PdrMotionPlugin())
    }
}
