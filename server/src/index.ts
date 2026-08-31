import express from 'express';
import cors from 'cors';
import path from 'path';
import { PORT } from './config/constants';
import { initDatabase, db } from './config/database';
import { seedDatabase } from './db/seed';

import { authRouter } from './routes/authRoutes';
import { supplierRouter } from './routes/supplierRoutes';
import { requisitionRouter } from './routes/requisitionRoutes';
import { tenderRouter } from './routes/tenderRoutes';
import { bidRouter } from './routes/bidRoutes';
import { evaluationRouter } from './routes/evaluationRoutes';
import { awardRouter } from './routes/awardRoutes';
import { contractRouter } from './routes/contractRoutes';
import { poRouter } from './routes/poRoutes';
import { grnRouter } from './routes/grnRoutes';
import { invoiceRouter } from './routes/invoiceRoutes';
import { paymentRouter } from './routes/paymentRoutes';
import { workflowRouter } from './routes/workflowRoutes';
import { approvalRouter } from './routes/approvalRoutes';
import { performanceRiskRouter } from './routes/performanceRiskRoutes';
import { masterDataRouter } from './routes/masterDataRoutes';
import { analyticsRouter } from './routes/analyticsRoutes';
import { auditRouter } from './routes/auditRoutes';
import { userRouter } from './routes/userRoutes';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files (uploaded documents)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/suppliers', supplierRouter);

app.use('/api/requisitions', requisitionRouter);
app.use('/api/tenders', tenderRouter);
app.use('/api/bids', bidRouter);
app.use('/api/evaluations', evaluationRouter);
app.use('/api/awards', awardRouter);
app.use('/api/contracts', contractRouter);
app.use('/api/pos', poRouter);
app.use('/api/grns', grnRouter);
app.use('/api/invoices', invoiceRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/workflows', workflowRouter);
app.use('/api/approvals', approvalRouter);
app.use('/api/performance-risk', performanceRiskRouter);
app.use('/api/master-data', masterDataRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/audit', auditRouter);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

async function startServer() {
  await initDatabase();
  await seedDatabase();

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 E-Procurement API Server running on port ${PORT}`);
    console.log(`📁 Database: SQLite (sql.js / WASM) with auto-persistence`);
    console.log(`🌐 Ready to handle enterprise procurement lifecycle!`);
    console.log(`=======================================================`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
