const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");

const databasePath = path.join(__dirname, "userData.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const validatePassword = (password) => {
  return password.length > 4;
};

app.post("/register", async (request, response) => {
  const { username, email, password } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE email = '${email}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user (email, password, username)
     VALUES
      (
       '${email}',
       '${hashedPassword}',
       '${username}'  
      );`;
    const user = await database.run(createUserQuery);
    response.send("User created successfully");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { email, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE email = '${email}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.put("/forgot-user-password", async (request, response) => {
  const { email, newPassword } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE email = '${email}';`;
  const databaseUser = await database.get(selectUserQuery);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      newPassword,
      databaseUser.password
    );
    if (isPasswordMatched === false) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updatePasswordQuery = `
          UPDATE
            user
          SET
            password = '${hashedPassword}'
          WHERE
            email = '${email}';`;

      const user = await database.run(updatePasswordQuery);
      response.send("Password updated");
    } else {
      response.status(400);
      response.send("Current password is same as old password.");
    }
  }
});

module.exports = app;
