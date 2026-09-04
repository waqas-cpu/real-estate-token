/**
 * RWA Platform Modular CRUD Router
 * Integrates all domain controllers with dependency injection, RBAC, and error formatting.
 */
import { Router } from 'express';
import {
  PropertyRepository,
  PropertyDocumentRepository,
  SpvRepository,
  TokenRepository,
  InvestorRepository,
  KycRepository,
  WalletRepository,
  AllocationRepository,
  TransactionRepository,
} from '../repositories/RwaRepositories.js';
import {
  PropertyService,
  SpvService,
  TokenService,
  InvestorService,
  AllocationService,
  TransactionService,
} from '../services/RwaServices.js';
import {
  PropertyController,
  SpvController,
  TokenController,
  InvestorController,
  AllocationController,
  TransactionController,
} from '../controllers/RwaControllers.js';
import { DomainEventBus } from '../events/DomainEventBus.js';
import { AuditService } from '../audit/AuditService.js';
import { RwaBlockchainService } from '../blockchain/RwaBlockchainService.js';
import { rwaAuthMiddleware, requireRoles } from '../auth/rbac.js';
import { UserRole } from '../domain/enums.js';
import { AppError } from '../errors/DomainError.js';

export function createRwaCrudRouter(): Router {
  const router = Router();

  // Instantiate Repositories
  const propertyRepo = new PropertyRepository();
  const documentRepo = new PropertyDocumentRepository();
  const spvRepo = new SpvRepository();
  const tokenRepo = new TokenRepository();
  const investorRepo = new InvestorRepository();
  const kycRepo = new KycRepository();
  const walletRepo = new WalletRepository();
  const allocationRepo = new AllocationRepository();
  const txRepo = new TransactionRepository();

  // Infrastructure & Singletons
  const eventBus = DomainEventBus.getInstance();
  const blockchainService = new RwaBlockchainService();

  // Services
  const propertyService = new PropertyService(propertyRepo, documentRepo, spvRepo, eventBus, AuditService);
  const spvService = new SpvService(spvRepo, AuditService, eventBus);
  const tokenService = new TokenService(tokenRepo, propertyRepo, spvRepo, blockchainService, AuditService, eventBus);
  const investorService = new InvestorService(investorRepo, walletRepo, kycRepo, AuditService, eventBus);
  const allocationService = new AllocationService(allocationRepo, tokenRepo, investorRepo, kycRepo, blockchainService, AuditService, eventBus);
  const txService = new TransactionService(txRepo, AuditService, eventBus);

  // Controllers
  const propertyCtrl = new PropertyController(propertyService);
  const spvCtrl = new SpvController(spvService);
  const tokenCtrl = new TokenController(tokenService);
  const investorCtrl = new InvestorController(investorService);
  const allocationCtrl = new AllocationController(allocationService);
  const txCtrl = new TransactionController(txService);

  // Auth context parser
  router.use(rwaAuthMiddleware);

  // ── Property Routes ──────────────────────────────────────────
  router.post(
    '/properties',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_ADMIN, UserRole.ISSUER),
    propertyCtrl.create
  );
  router.get('/properties', propertyCtrl.list);
  router.get('/properties/:id', propertyCtrl.getById);
  router.patch(
    '/properties/:id',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_ADMIN, UserRole.ISSUER),
    propertyCtrl.update
  );
  router.delete(
    '/properties/:id',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_ADMIN),
    propertyCtrl.delete
  );

  // Property Documents
  router.post(
    '/properties/:id/documents',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_ADMIN, UserRole.ISSUER),
    propertyCtrl.uploadDocument
  );
  router.get('/properties/:id/documents', propertyCtrl.listDocuments);

  // ── SPV Routes ───────────────────────────────────────────────
  router.post(
    '/spvs',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.LEGAL_OFFICER, UserRole.PROPERTY_ADMIN),
    spvCtrl.create
  );
  router.get('/spvs/:id', spvCtrl.getById);
  router.patch(
    '/spvs/:id',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.LEGAL_OFFICER),
    spvCtrl.update
  );

  // ── Token Routes ─────────────────────────────────────────────
  router.post(
    '/tokens',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_ADMIN),
    tokenCtrl.create
  );
  router.get('/tokens', tokenCtrl.list);
  router.get('/tokens/:id', tokenCtrl.getById);
  router.patch(
    '/tokens/:id',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_ADMIN),
    tokenCtrl.update
  );
  router.post(
    '/tokens/:id/deploy',
    requireRoles(UserRole.SUPER_ADMIN),
    tokenCtrl.deploy
  );

  // ── Investor & Compliance Routes ─────────────────────────────
  router.post(
    '/investors',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTOR),
    investorCtrl.create
  );
  router.get('/investors/:id', investorCtrl.getById);
  router.patch(
    '/investors/:id',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTOR),
    investorCtrl.update
  );

  // Wallets
  router.post(
    '/investors/:id/wallets',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.INVESTOR),
    investorCtrl.linkWallet
  );
  router.get('/investors/:id/wallets', investorCtrl.listWallets);

  // KYC
  router.post(
    '/kyc-verifications',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTOR),
    investorCtrl.submitKyc
  );
  router.get('/investors/:id/kyc', investorCtrl.getKyc);

  // ── Allocation Routes ────────────────────────────────────────
  router.post(
    '/token-allocations',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.INVESTOR, UserRole.ISSUER),
    allocationCtrl.create
  );
  router.get('/token-allocations/:id', allocationCtrl.getById);

  // ── Transaction Routes ───────────────────────────────────────
  router.post(
    '/transactions',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.PROPERTY_ADMIN),
    txCtrl.create
  );
  router.get('/transactions/:id', txCtrl.getById);
  router.patch(
    '/transactions/:id/confirm',
    requireRoles(UserRole.SUPER_ADMIN),
    txCtrl.confirm
  );

  // ── Audit Log Query (Auditors & Admins) ───────────────────────
  router.get(
    '/audit-logs',
    requireRoles(UserRole.SUPER_ADMIN, UserRole.AUDITOR, UserRole.COMPLIANCE_OFFICER),
    (req, res) => {
      const logs = AuditService.query({
        entityType: req.query.entity_type as string,
        entityId: req.query.entity_id as string,
        actorId: req.query.actor_id as string,
        correlationId: req.query.correlation_id as string,
        limit: parseInt(req.query.limit as string, 10) || 50,
      });
      res.status(200).json({ data: logs });
    }
  );

  // ── Centralized Error Handler (RFC 7807) ─────────────────────
  router.use((err: any, _req: any, res: any, next: any) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json(err.toJSON());
      return;
    }

    if (err.name === 'ZodError') {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload parameters.',
          details: err.issues,
        },
      });
      return;
    }

    next(err);
  });

  return router;
}
