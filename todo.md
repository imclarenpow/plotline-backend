1. Design & implement some logic for calculating book xp.
2. Add book redis values to db as part of business logic.
3. Split out payloads into seperate item types in redis - e.g. from search & from works endpoints for books. Then we splice information together to create the required rows in their respective tables.