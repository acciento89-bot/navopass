import Foundation
@main struct TextSafety {
    static func main() throws {
        let owner="00000000-0000-4000-8000-000000000001", pass="00000000-0000-4000-8000-000000000002"
        for field in 0..<3 {
            var rejected=false
            do { _ = try ServiceDraft.create(ownerId:owner,passId:pass,passLabel:"QA",eventDate:"2026-10-25",title:field==0 ? "QA\0note":"QA",description:field==1 ? "Original\0note":"Original",provider:field==2 ? "QA\0provider":"QA",eventType:.service) } catch {rejected=true}
            guard rejected else {fputs("FAIL PostgreSQL cannot store NUL in field \(field)\n",stderr);exit(1)}
        }
        let command=FrozenServiceDraft(ownerId:owner,passId:pass,draftId:"00000000-0000-4000-8000-000000000003",revision:1,eventDate:"2026-10-25",title:"QA Service",description:"Original\nnotes ä </script>",provider:"QA",eventType:.service)
        guard command.digest == "afaa60edb2000869bb5506dc5135c61b46e9693e037e7be01590fd178c54e84f" else {fputs("FAIL canonical digest mismatch\n",stderr);exit(1)}
        print("PASS NUL rejected in all stored text fields; cross-platform digest \(command.digest)")
    }
}
