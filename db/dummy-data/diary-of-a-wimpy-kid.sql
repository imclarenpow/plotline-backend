-- Dummy data: Jeff Kinney and three Diary of a Wimpy Kid books.
-- Requires the lookup seeds (formats, contributor_roles, sources).
SET @prose = (SELECT id FROM formats WHERE name = 'prose');
SET @author_role = (SELECT id FROM contributor_roles WHERE name = 'author');
SET @openlibrary = (SELECT id FROM sources WHERE name = 'openlibrary');

-- Contributor
SET @jeff_kinney = UUID_TO_BIN(UUID(), 1);
INSERT INTO contributors (id, name, bio, birth_date, death_date)
VALUES (
        @jeff_kinney,
        'Jeff Kinney',
        'Jeffrey Patrick "Jeff" Kinney (born February 19, 1971) is an American game designer and author of childrens books including the Diary of a Wimpy Kid book series. He is also attributed to be the creator of the children-oriented website Poptropica. Kinney attended Pittsburgh high school in Pittsburgh and currently lives in Tustin, California with his wife and two sons Will and Grant.',
        '1971-02-19',
        NULL
    );
INSERT INTO contributor_external_ids (source_id, external_id, contributor_id)
VALUES (@openlibrary, 'OL2832500A', @jeff_kinney),
    ((SELECT id FROM sources WHERE name = 'goodreads'), '221559', @jeff_kinney),
    ((SELECT id FROM sources WHERE name = 'librarything'), 'kinneyjeff', @jeff_kinney),
    ((SELECT id FROM sources WHERE name = 'isni'), '0000000119480276', @jeff_kinney),
    ((SELECT id FROM sources WHERE name = 'wikidata'), 'Q311704', @jeff_kinney);

-- Series
SET @wimpy_kid_series = UUID_TO_BIN(UUID(), 1);
INSERT INTO series (id, name, format_id)
VALUES (@wimpy_kid_series, 'Diary of a Wimpy Kid', @prose);

-- Book 1
SET @diary_of_a_wimpy_kid = UUID_TO_BIN(UUID(), 1);
INSERT INTO works (id, title, description, format_id, first_published_year, page_count)
VALUES (
        @diary_of_a_wimpy_kid,
        'Diary of a Wimpy Kid',
        'Greg Heffley finds thrust into middle school, where undersized weaklings like him share the hallways with much bigger kids who are already shaving. But nothing scares Greg more than the moldy piece of cheese on the blacktop. Can he and his best friend, Rowley Jefferson, make it through the year without getting the Cheese Touch?',
        @prose,
        2007,
        224
    );
INSERT INTO work_external_ids (source_id, external_id, work_id)
VALUES (@openlibrary, 'OL8483260W', @diary_of_a_wimpy_kid);
SET @diary_edition = UUID_TO_BIN(UUID(), 1);
INSERT INTO editions (id, work_id, page_count)
VALUES (@diary_edition, @diary_of_a_wimpy_kid, 224);
INSERT INTO edition_external_ids (source_id, external_id, edition_id)
VALUES (@openlibrary, 'OL36660032M', @diary_edition);
INSERT INTO work_contributors (work_id, contributor_id, role_id)
VALUES (@diary_of_a_wimpy_kid, @jeff_kinney, @author_role);
INSERT INTO work_series (work_id, series_id, position)
VALUES (@diary_of_a_wimpy_kid, @wimpy_kid_series, 1);

-- Book 9
SET @the_long_haul = UUID_TO_BIN(UUID(), 1);
INSERT INTO works (id, title, description, format_id, first_published_year, page_count)
VALUES (
        @the_long_haul,
        'The Long Haul',
        'A family road trip is supposed to be a lot of fun... Unless, of course, you are the Heffleys. The journey starts off full of promise, then quickly takes several wrong turns. Gas station bathrooms, crazed seagulls, a fender bender, and a runaway pig — not exactly Greg Heffleys idea of a good time. But even the worst road trip can turn into an adventure — and this is one the Heffleys wont soon forget.',
        @prose,
        2014,
        218
    );
INSERT INTO work_external_ids (source_id, external_id, work_id)
VALUES (@openlibrary, 'OL17076678W', @the_long_haul);
INSERT INTO work_contributors (work_id, contributor_id, role_id)
VALUES (@the_long_haul, @jeff_kinney, @author_role);
INSERT INTO work_series (work_id, series_id, position)
VALUES (@the_long_haul, @wimpy_kid_series, 9);

-- Book 14
SET @wrecking_ball = UUID_TO_BIN(UUID(), 1);
INSERT INTO works (id, title, description, format_id, first_published_year, page_count)
VALUES (
        @wrecking_ball,
        'Wrecking Ball',
        'Very interesting. I recommend Diary of a wimpy kid as Greg and his crazy family are always cooking up hilarious moments and silly accidents. -Hilariously Crazy',
        @prose,
        2019,
        220
    );
INSERT INTO work_external_ids (source_id, external_id, work_id)
VALUES (@openlibrary, 'OL20465177W', @wrecking_ball);
SET @wrecking_ball_edition = UUID_TO_BIN(UUID(), 1);
INSERT INTO editions (id, work_id, page_count)
VALUES (@wrecking_ball_edition, @wrecking_ball, 220);
INSERT INTO edition_external_ids (source_id, external_id, edition_id)
VALUES (@openlibrary, 'OL27918055M', @wrecking_ball_edition);
INSERT INTO work_contributors (work_id, contributor_id, role_id)
VALUES (@wrecking_ball, @jeff_kinney, @author_role);
INSERT INTO work_series (work_id, series_id, position)
VALUES (@wrecking_ball, @wimpy_kid_series, 14);
