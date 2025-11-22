-- Set Author ID to use across rows created in tables
SET @jeff_kinney = UUID_TO_BIN(UUID(), 1);
INSERT INTO authors (id, name, bio, birth_date, death_date)
VALUES (
        @jeff_kinney,
        'Jeff Kinney',
        'Jeffrey Patrick "Jeff" Kinney (born February 19, 1971) is an American game designer and author of childrens books including the Diary of a Wimpy Kid book series. He is also attributed to be the creator of the children-oriented website Poptropica. Kinney attended Pittsburgh high school in Pittsburgh and currently lives in Tustin, California with his wife and two sons Will and Grant.',
        '1965-07-31',
        NULL
    );
INSERT INTO authors_ol(author_id, olauthor_id)
VALUES(@jeff_kinney, 'OL2832500A');
INSERT INTO authors_remote_ids(author_id, source, remote_id)
VALUES(@jeff_kinney, 'goodreads', '221559');
INSERT INTO authors_remote_ids(author_id, source, remote_id)
VALUES(@jeff_kinney, 'librarything', 'kinneyjeff');
INSERT INTO authors_remote_ids(author_id, source, remote_id)
VALUES(@jeff_kinney, 'isni', '0000000119480276');
INSERT INTO authors_remote_ids(author_id, source, remote_id)
VALUES(@jeff_kinney, 'wikidata', 'Q311704');
-- Set Book ID to user across rows created in tables
SET @diary_of_a_wimpy_kid = UUID_TO_BIN(UUID(), 1);
INSERT INTO books (id, title, subtitle, bio, number_of_pages, xp)
VALUES (
        @diary_of_a_wimpy_kid,
        'Diary of a Wimpy Kid',
        NULL,
        'Greg Heffley finds thrust into middle school, where undersized weaklings like him share the hallways with much bigger kids who are already shaving. But nothing scares Greg more than the moldy piece of cheese on the blacktop. Can he and his best friend, Rowley Jefferson, make it through the year without getting the Cheese Touch?',
        224,
        19800
    );
INSERT INTO books_ol (book_id, work_id, cover_id)
VALUES (
        @diary_of_a_wimpy_kid,
        'OL8483260W',
        'OL36660032M'
    );
INSERT INTO book_authors (author_id, book_id)
VALUES(@jeff_kinney, @diary_of_a_wimpy_kid);
-- Create a follow up book
SET @wrecking_ball = UUID_TO_BIN(UUID(), 1);
INSERT INTO books (id, title, subtitle, bio, number_of_pages, xp)
VALUES (
        @wrecking_ball,
        'Wrecking Ball',
        NULL,
        'Very interesting. I recommend Diary of a wimpy kid as Greg and his crazy family are always cooking up hilarious moments and silly accidents. -Hilariously Crazy',
        220,
        19
    );
INSERT INTO books_ol (book_id, work_id, cover_id)
VALUES (
        @wrecking_ball,
        'OL20465177W',
        'OL27918055M'
    );
INSERT INTO book_authors (author_id, book_id)
VALUES(@jeff_kinney, @wrecking_ball);
-- Create another follow up book
SET @the_long_haul = UUID_TO_BIN(UUID(), 1);
INSERT INTO books (id, title, subtitle, bio, number_of_pages, xp)
VALUES (
        @the_long_haul,
        'The Long Haul',
        NULL,
        'A family road trip is supposed to be a lot of fun... Unless, of course, you are the Heffleys. The journey starts off full of promise, then quickly takes several wrong turns. Gas station bathrooms, crazed seagulls, a fender bender, and a runaway pig — not exactly Greg Heffleys idea of a good time. But even the worst road trip can turn into an adventure — and this is one the Heffleys wont soon forget.',
        218,
        2800
    );
INSERT INTO books_ol (book_id, work_id, cover_id)
VALUES (
        @the_long_haul,
        'OL17076678W',
        'OL27918055M'
    );
INSERT INTO book_authors (author_id, book_id)
VALUES(@jeff_kinney, @the_long_haul);