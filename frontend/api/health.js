module.exports = async (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
};