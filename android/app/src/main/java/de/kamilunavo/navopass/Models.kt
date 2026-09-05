package de.kamilunavo.navopass

data class NavoUser(
    val id: String,
    val email: String,
    val name: String,
    val plan: String,
    val reminderDays: Int,
    val accountType: String,
    val companyName: String?,
    val professionalTitle: String?
)

data class Asset(
    val id: String,
    val publicId: String,
    val name: String,
    val category: String,
    val manufacturer: String?,
    val model: String?,
    val serialNumber: String?,
    val purchaseDate: String?,
    val warrantyUntil: String?,
    val nextServiceDate: String?,
    val serviceIntervalMonths: Int,
    val location: String?,
    val notes: String?,
    val visibility: String,
    val favorite: Boolean,
    val archivedAt: String?,
    val workspaceName: String?
)

data class AssetEvent(
    val id: String,
    val title: String,
    val eventType: String,
    val eventDate: String,
    val description: String?,
    val provider: String?
)

data class AssetDocument(
    val id: String,
    val title: String,
    val url: String,
    val kind: String
)

data class AssetDetails(
    val asset: Asset,
    val events: List<AssetEvent>,
    val documents: List<AssetDocument>
)

data class WorkspaceInvite(
    val id: String,
    val workspaceName: String,
    val role: String,
    val expiresAt: String
)

data class ServiceJob(
    val id: String,
    val title: String,
    val scheduledFor: String?,
    val priority: String,
    val status: String,
    val assetName: String,
    val customerName: String?
)

data class MobileOverview(
    val invites: List<WorkspaceInvite>,
    val jobs: List<ServiceJob>,
    val professional: Boolean,
    val business: Boolean
)

data class AssetDraft(
    val name: String,
    val category: String = "Other",
    val manufacturer: String = "",
    val model: String = "",
    val serialNumber: String = "",
    val purchaseDate: String = "",
    val warrantyUntil: String = "",
    val nextServiceDate: String = "",
    val location: String = "",
    val notes: String = "",
    val visibility: String = "LINK",
    val serviceIntervalMonths: Int = 12
)

sealed interface AppRoute {
    data object Main : AppRoute
    data class AssetDetail(val id: String) : AppRoute
    data object NewAsset : AppRoute
    data object Account : AppRoute
    data object DeleteAccount : AppRoute
}
