SET @user = UUID_TO_BIN(UUID(), 1);
INSERT INTO users (id, username, name, email, password_hash)
VALUES (
        @user,
        'n.ano',
        'Isaac Powell',
        'isaac@plotline.nz',
        'test'
    );