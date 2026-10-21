import Foundation

struct ServiceDraftAccountToken {
    let ownerId: String
    let generation: Int
}

struct ServiceDraftVerificationAttempt {
    let ownerId: String?
    let generation: Int
}

/// Bridges only verified old-session outcomes to the independent draft journal.
@MainActor final class ServiceDraftSessionAdapter {
    let coordinator: ServiceDraftCoordinator
    init(coordinator: ServiceDraftCoordinator) { self.coordinator = coordinator }
    func verifiedSession(userId: String) throws { try coordinator.authenticate(ownerId: userId) }
    func beginVerification(userId: String? = nil) -> ServiceDraftVerificationAttempt {
        ServiceDraftVerificationAttempt(ownerId: userId, generation: coordinator.generation)
    }
    @discardableResult func verifiedSession(userId: String, attempt: ServiceDraftVerificationAttempt) throws -> Bool {
        guard attempt.generation == coordinator.generation else { return false }
        guard attempt.ownerId == nil || attempt.ownerId == userId else { coordinator.suspendAuthentication(); return false }
        if coordinator.currentOwner == userId, !coordinator.locked { return true }
        try coordinator.authenticate(ownerId: userId); return true
    }
    func sessionUnavailable() { coordinator.suspendAuthentication() }
    func willLogout() { do { try coordinator.deactivate() } catch { /* Journal is hidden/locked; old logout must still run. */ } }
    func beginAuthorizedOperation(userId: String) -> ServiceDraftAccountToken? {
        guard coordinator.currentOwner == userId, !coordinator.locked else { return nil }
        return ServiceDraftAccountToken(ownerId: userId, generation: coordinator.generation)
    }
    func loadedPass(token: ServiceDraftAccountToken, passId: String, label: String, canEdit: Bool) throws {
        try coordinator.capturePass(ownerId: token.ownerId, expectedGeneration: token.generation, passId: passId, label: label, canEdit: canEdit)
    }
    /// Capture only from the existing authenticated API user before awaiting server deletion.
    func beginAccountDeletion(userId: String) -> ServiceDraftAccountToken? {
        guard UUID(uuidString: userId) != nil, coordinator.currentOwner == nil || coordinator.currentOwner == userId else { return nil }
        return ServiceDraftAccountToken(ownerId: userId, generation: coordinator.generation)
    }
    func accountDeletionFinished(token: ServiceDraftAccountToken?, success: Bool) {
        guard let token else { return }
        coordinator.accountDeletionCompleted(ownerId: token.ownerId, expectedGeneration: token.generation, success: success)
    }
}
