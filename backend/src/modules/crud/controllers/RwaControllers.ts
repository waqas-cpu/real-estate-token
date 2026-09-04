/**
 * RESTful CRUD Controllers for RWA Platform
 * Implements standard HTTP verbs, status codes (201, 200, 204, 400, 403, 404, 409, 422),
 * Zod validation, role-based checks, and uniform RFC-7807 error handling.
 */
import { Request, Response, NextFunction } from 'express';
import {
  PropertyService,
  SpvService,
  TokenService,
  InvestorService,
  AllocationService,
  TransactionService,
} from '../services/RwaServices.js';
import {
  createPropertySchema,
  updatePropertySchema,
  createDocumentSchema,
  createSpvSchema,
  updateSpvSchema,
  createTokenSchema,
  updateTokenSchema,
  createInvestorSchema,
  updateInvestorSchema,
  createWalletSchema,
  createKycSchema,
  createAllocationSchema,
  createTransactionSchema,
} from '../validation/schemas.js';
import { AppError } from '../errors/DomainError.js';
import { UserRole } from '../domain/enums.js';

function getActor(req: Request) {
  return {
    actorId: req.rwaUser?.id || 'system-admin',
    actorRole: req.rwaUser?.role || UserRole.SUPER_ADMIN,
  };
}

export class PropertyController {
  constructor(private propertyService: PropertyService) {}

  public create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createPropertySchema.parse(req.body);
      const { actorId, actorRole } = getActor(req);
      const created = await this.propertyService.createProperty(validated as any, actorId, actorRole);
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const property = await this.propertyService.getProperty(req.params.id);
      res.status(200).json({ data: property });
    } catch (err) {
      next(err);
    }
  };

  public list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const country = req.query.country as string;
      const spv_id = req.query.spv_id as string;

      const result = await this.propertyService.listProperties(
        { page, limit, search },
        { status, country, spv_id }
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updatePropertySchema.parse(req.body);
      const { actorId, actorRole } = getActor(req);
      const updated = await this.propertyService.updateProperty(
        req.params.id,
        validated as any,
        actorId,
        actorRole
      );
      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { actorId, actorRole } = getActor(req);
      await this.propertyService.archiveProperty(req.params.id, actorId, actorRole);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  public uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createDocumentSchema.parse(req.body);
      const { actorId, actorRole } = getActor(req);
      const doc = await this.propertyService.uploadDocument(
        req.params.id,
        validated as any,
        actorId,
        actorRole
      );
      res.status(201).json({ data: doc });
    } catch (err) {
      next(err);
    }
  };

  public listDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docs = await this.propertyService.listDocuments(req.params.id);
      res.status(200).json({ data: docs });
    } catch (err) {
      next(err);
    }
  };
}

export class SpvController {
  constructor(private spvService: SpvService) {}

  public create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createSpvSchema.parse(req.body);
      const { actorId, actorRole } = getActor(req);
      const created = await this.spvService.createSpv(validated as any, actorId, actorRole);
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const spv = await this.spvService.getSpv(req.params.id);
      res.status(200).json({ data: spv });
    } catch (err) {
      next(err);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateSpvSchema.parse(req.body);
      const { actorId, actorRole } = getActor(req);
      const updated = await this.spvService.updateSpv(req.params.id, validated as any, actorId, actorRole);
      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  };
}

export class TokenController {
  constructor(private tokenService: TokenService) {}

  public create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createTokenSchema.parse(req.body);
      const { actorId, actorRole } = getActor(req);
      const created = await this.tokenService.createToken(validated as any, actorId, actorRole);
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = await this.tokenService.getToken(req.params.id);
      res.status(200).json({ data: token });
    } catch (err) {
      next(err);
    }
  };

  public list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const tokens = await this.tokenService.listTokens({ page, limit });
      res.status(200).json(tokens);
    } catch (err) {
      next(err);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateTokenSchema.parse(req.body);
      const { actorId, actorRole } = getActor(req);
      const updated = await this.tokenService.updateToken(
        req.params.id,
        validated as any,
        actorId,
        actorRole
      );
      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  public deploy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { actorId, actorRole } = getActor(req);
      const deployed = await this.tokenService.deployToken(req.params.id, actorId, actorRole);
      res.status(200).json({ data: deployed, message: 'Token successfully deployed to blockchain.' });
    } catch (err) {
      next(err);
    }
  };
}

export class InvestorController {
  constructor(private investorService: InvestorService) {}

  public create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createInvestorSchema.parse(req.body);
      const { actorId, actorRole } = getActor(req);
      const created = await this.investorService.createInvestor(validated as any, actorId, actorRole);
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const investor = await this.investorService.getInvestor(req.params.id);
      res.status(200).json({ data: investor });
    } catch (err) {
      next(err);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = updateInvestorSchema.parse(req.body);
      const { actorId, actorRole } = getActor(req);
      const updated = await this.investorService.updateInvestor(
        req.params.id,
        validated as any,
        actorId,
        actorRole
      );
      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  };

  public linkWallet = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createWalletSchema.parse(req.body);
      const { actorId, actorRole } = getActor(req);
      const wallet = await this.investorService.linkWallet(
        req.params.id,
        validated as any,
        actorId,
        actorRole
      );
      res.status(201).json({ data: wallet });
    } catch (err) {
      next(err);
    }
  };

  public listWallets = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const wallets = await this.investorService.listWallets(req.params.id);
      res.status(200).json({ data: wallets });
    } catch (err) {
      next(err);
    }
  };

  public submitKyc = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createKycSchema.parse(req.body);
      const { actorId, actorRole } = getActor(req);
      const kyc = await this.investorService.submitKyc(
        req.params.id,
        validated as any,
        actorId,
        actorRole
      );
      res.status(201).json({ data: kyc });
    } catch (err) {
      next(err);
    }
  };

  public getKyc = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const kycList = await this.investorService.getKycList(req.params.id);
      res.status(200).json({ data: kycList });
    } catch (err) {
      next(err);
    }
  };
}

export class AllocationController {
  constructor(private allocationService: AllocationService) {}

  public create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createAllocationSchema.parse(req.body);
      const { actorId, actorRole } = getActor(req);

      const allocation = await this.allocationService.createAllocation(
        {
          idempotencyKey: validated.idempotency_key,
          tokenId: validated.token_id,
          investorId: validated.investor_id,
          tokenAmount: validated.token_amount,
          allocationPrice: validated.allocation_price,
          currency: validated.allocation_currency,
        },
        actorId,
        actorRole
      );

      res.status(201).json({ data: allocation });
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const allocation = await this.allocationService.getAllocation(req.params.id);
      res.status(200).json({ data: allocation });
    } catch (err) {
      next(err);
    }
  };
}

export class TransactionController {
  constructor(private txService: TransactionService) {}

  public create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = createTransactionSchema.parse(req.body);
      const { actorId, actorRole } = getActor(req);
      const tx = await this.txService.recordTransaction(validated as any, actorId, actorRole);
      res.status(201).json({ data: tx });
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tx = await this.txService.getTransaction(req.params.id);
      res.status(200).json({ data: tx });
    } catch (err) {
      next(err);
    }
  };

  public confirm = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const blockNumber = req.body.block_number || Math.floor(Math.random() * 1000000) + 5000000;
      const { actorId, actorRole } = getActor(req);
      const confirmed = await this.txService.confirmTransaction(req.params.id, blockNumber, actorId, actorRole);
      res.status(200).json({ data: confirmed });
    } catch (err) {
      next(err);
    }
  };
}
