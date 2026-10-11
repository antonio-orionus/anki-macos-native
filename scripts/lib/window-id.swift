// Prints the CGWindowID of Anki's main window, the largest normal-layer
// on-screen window owned by Anki. Exits 1 when there is none.
import CoreGraphics
import Foundation

let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] ?? []
let main = windows
    .filter { ($0[kCGWindowOwnerName as String] as? String) == "Anki" && ($0[kCGWindowLayer as String] as? Int) == 0 }
    .max { a, b in
        let area = { (w: [String: Any]) -> Double in
            let b = w[kCGWindowBounds as String] as? [String: Double] ?? [:]
            return (b["Width"] ?? 0) * (b["Height"] ?? 0)
        }
        return area(a) < area(b)
    }
guard let id = main?[kCGWindowNumber as String] else { exit(1) }
print(id)
