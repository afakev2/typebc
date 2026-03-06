// keep_alive.js
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('البوت شغال ✅');
});

app.listen(port, () => {
  console.log(`🚀 خادم keep-alive يعمل على المنفذ ${port}`);
});
