// keep-focus.swift <bundle-id>
//
// Remembers the app that is frontmost when started. Whenever <bundle-id>
// activates, hands focus straight back to that app. Prints one line per
// activation ("ready …", "activated <id>", "returned <id>") and runs until
// terminated. Used by screenshots.mjs so relaunching Anki never leaves the
// user's keyboard focus in Anki.
import AppKit

let guarded = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "net.ankiweb.anki"
let original = NSWorkspace.shared.frontmostApplication?.bundleIdentifier ?? ""

func say(_ line: String) {
    print(String(format: "%.3f %@", Date().timeIntervalSince1970, line))
    fflush(stdout)
}

say("ready \(original)")

NSWorkspace.shared.notificationCenter.addObserver(
    forName: NSWorkspace.didActivateApplicationNotification, object: nil, queue: .main
) { note in
    guard let app = note.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication else { return }
    let id = app.bundleIdentifier ?? "?"
    say("activated \(id)")
    guard id == guarded, !original.isEmpty, original != guarded else { return }
    // `open -b` goes through LaunchServices, which macOS honours for
    // activation requests from background processes.
    let open = Process()
    open.executableURL = URL(fileURLWithPath: "/usr/bin/open")
    open.arguments = ["-b", original]
    try? open.run()
    say("returned \(original)")
}

RunLoop.main.run()
