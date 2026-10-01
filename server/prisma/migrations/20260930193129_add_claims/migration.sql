BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[Item] DROP CONSTRAINT [Item_addedById_fkey];

-- CreateTable
CREATE TABLE [dbo].[Claim] (
    [id] INT NOT NULL IDENTITY(1,1),
    [itemId] INT NOT NULL,
    [claimantId] INT NOT NULL,
    [ownershipDetails] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Claim_status_df] DEFAULT 'pending',
    [adminNote] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Claim_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [reviewedAt] DATETIME2,
    CONSTRAINT [Claim_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ClaimAnswer] (
    [id] INT NOT NULL IDENTITY(1,1),
    [claimId] INT NOT NULL,
    [questionId] INT NOT NULL,
    [answer] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [ClaimAnswer_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Item] ADD CONSTRAINT [Item_addedById_fkey] FOREIGN KEY ([addedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Claim] ADD CONSTRAINT [Claim_itemId_fkey] FOREIGN KEY ([itemId]) REFERENCES [dbo].[Item]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Claim] ADD CONSTRAINT [Claim_claimantId_fkey] FOREIGN KEY ([claimantId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClaimAnswer] ADD CONSTRAINT [ClaimAnswer_claimId_fkey] FOREIGN KEY ([claimId]) REFERENCES [dbo].[Claim]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ClaimAnswer] ADD CONSTRAINT [ClaimAnswer_questionId_fkey] FOREIGN KEY ([questionId]) REFERENCES [dbo].[SecretQuestion]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
