import { createApp } from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 4000;
const { app } = createApp();

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` SocietyClean Waste Management Server Running`);
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(` Health:    http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});
