BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Item] (
    [id] INT NOT NULL IDENTITY(1,1),
    [title] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [locationFound] NVARCHAR(1000) NOT NULL,
    [dateFound] DATETIME2 NOT NULL,
    [imagePath] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Item_status_df] DEFAULT 'unclaimed',
    [addedById] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Item_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Item_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[SecretQuestion] (
    [id] INT NOT NULL IDENTITY(1,1),
    [itemId] INT NOT NULL,
    [question] NVARCHAR(1000) NOT NULL,
    [answer] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [SecretQuestion_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Item] ADD CONSTRAINT [Item_addedById_fkey] FOREIGN KEY ([addedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[SecretQuestion] ADD CONSTRAINT [SecretQuestion_itemId_fkey] FOREIGN KEY ([itemId]) REFERENCES [dbo].[Item]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
