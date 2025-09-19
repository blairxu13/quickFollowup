// 1. it should be able to connect back with chrome extension
//(if extension detects u have a pet(a check), show it)
//  2. create a table for the pets, and connect it with coins TBD

import express from "express";

const app = express();

const PORT = 3000;

app.use(express.json());

app.get("/health", (req, res) => {
    res.json({ ok: true });
  });
  
  // Start the server
  app.listen(PORT, () => {
    console.log(` Server running at http://localhost:${PORT}`);
  });

