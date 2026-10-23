import Foundation
@main struct DeletionTests {
 @MainActor static func main() throws {
  let a="00000000-0000-4000-8000-000000000001",b="00000000-0000-4000-8000-000000000002",pass="00000000-0000-4000-8000-000000000003"
  let root=FileManager.default.temporaryDirectory.appendingPathComponent("navopass-delete-"+UUID().uuidString);defer {try? FileManager.default.removeItem(at:root)}
  let store=ServiceDraftCoordinator(baseURL:root,transport:{_ in throw ServiceDraftPublishError.unknown}),adapter=ServiceDraftSessionAdapter(coordinator:store)
  try adapter.verifiedSession(userId:a);let t=adapter.beginAuthorizedOperation(userId:a)!
  try adapter.loadedPass(token:t,passId:pass,label:"QA A",canEdit:true)
  _ = try store.create(passId:pass,eventDate:"2026-10-25",title:"A private",description:"Only A",provider:"",eventType:.note)
  adapter.sessionUnavailable();let file=root.appendingPathComponent("service-drafts/"+a+".json"),bad=Data("unreadable original A bytes".utf8)
  try bad.write(to:file);do {try adapter.verifiedSession(userId:a)}catch {}
  guard store.locked else {fatalError("Unreadable journal must lock")}
  let deleting=adapter.beginAccountDeletion(userId:a)
  adapter.accountDeletionFinished(token:deleting,success:false)
  guard try Data(contentsOf:file)==bad else {fatalError("Failed server deletion must preserve corrupt own bytes")}
  let generation=store.generation
  adapter.accountDeletionFinished(token:deleting,success:true)
  guard !FileManager.default.fileExists(atPath:file.path),store.currentOwner==nil,store.generation>generation else {fatalError("Confirmed deletion purges unreadable own journal and cancels operations")}
  try adapter.verifiedSession(userId:b);let bt=adapter.beginAuthorizedOperation(userId:b)!
  try adapter.loadedPass(token:bt,passId:pass,label:"QA B",canEdit:true)
  _ = try store.create(passId:pass,eventDate:"2026-10-25",title:"B private",description:"Only B",provider:"",eventType:.note)
  let bf=root.appendingPathComponent("service-drafts/"+b+".json"),before=try Data(contentsOf:bf)
  adapter.accountDeletionFinished(token:deleting,success:true)
  guard store.currentOwner==b,try Data(contentsOf:bf)==before else {fatalError("Late A deletion cannot mutate B")}
  print("PASS deletion-specific verified-owner token: unreadable own purge, failed-delete retention, generation cancellation and stale B protection")
 }
}
