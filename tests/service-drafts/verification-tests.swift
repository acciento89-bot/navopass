import Foundation
@main struct VerificationTests {
 @MainActor static func main() throws {
  let a="00000000-0000-4000-8000-000000000001",b="00000000-0000-4000-8000-000000000002",pass="00000000-0000-4000-8000-000000000003"
  let root=FileManager.default.temporaryDirectory.appendingPathComponent("navopass-verification-"+UUID().uuidString);defer {try? FileManager.default.removeItem(at:root)}
  let store=ServiceDraftCoordinator(baseURL:root,transport:{_ in throw ServiceDraftPublishError.unknown}),adapter=ServiceDraftSessionAdapter(coordinator:store)
  try adapter.verifiedSession(userId:a)
  let attempt=adapter.beginVerification(userId:a)
  adapter.willLogout();try adapter.verifiedSession(userId:b)
  let token=adapter.beginAuthorizedOperation(userId:b)!
  try adapter.loadedPass(token:token,passId:pass,label:"QA B",canEdit:true)
  _ = try store.create(passId:pass,eventDate:"2026-10-25",title:"B private",description:"Only B",provider:"",eventType:.note)
  let file=root.appendingPathComponent("service-drafts/"+b+".json"),before=try Data(contentsOf:file)
  guard try !adapter.verifiedSession(userId:a,attempt:attempt),store.currentOwner==b,try Data(contentsOf:file)==before else {fatalError("Late A verification must not open A or purge B")}
  let pending=adapter.beginVerification(userId:b);adapter.willLogout()
  guard try !adapter.verifiedSession(userId:b,attempt:pending),store.currentOwner==nil else {fatalError("Late callback cannot reopen after explicit logout")}
  try adapter.verifiedSession(userId:b);let mismatch=adapter.beginVerification(userId:b)
  guard try !adapter.verifiedSession(userId:a,attempt:mismatch),store.currentOwner==nil else {fatalError("Current response with different owner must lock, never open A")}
  let cold=adapter.beginVerification();guard try adapter.verifiedSession(userId:b,attempt:cold),store.currentOwner==b else {fatalError("Fresh verified cold session can open matching owner")}
  print("PASS verified-session generation/owner guards, B bytes preserved, logout not resurrected")
 }
}
