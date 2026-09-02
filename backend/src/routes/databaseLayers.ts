/**
 * DATABASE LAYERS REST API ROUTES
 * ================================
 * Exposes endpoints for the 4 sovereign database layers:
 * 1. /api/v1/database/properties (PostgreSQL + PostGIS)
 * 2. /api/v1/database/documents (PostgreSQL + Object Storage)
 * 3. /api/v1/database/investors (PostgreSQL)
 * 4. /api/v1/database/tokenization (PostgreSQL)
 */

import { Router, Request, Response } from 'express';
import { databaseManager } from '../services/database/DatabaseLayerManager.js';
import type { PropertyType, LegalDocumentType, AccreditationStatus, KycStatus } from '../../../src/lib/types/databaseLayers.js';

const router = Router();

// ============================================================================
// SUMMARY & ARCHITECTURE STATUS
// ============================================================================
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const summary = await databaseManager.getDatabaseLayersSummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// LAYER 1: PROPERTY DATABASE (PostgreSQL + PostGIS)
// ============================================================================

// List / search properties (supports PostGIS radius / bounding box search)
router.get('/properties', async (req: Request, res: Response) => {
  try {
    const { lat, lng, radiusKm, propertyType, minValuation, maxValuation, spvId, limit, offset } = req.query;

    if (lat && lng && radiusKm) {
      const properties = await databaseManager.property.findPropertiesNearby(
        Number(lat),
        Number(lng),
        Number(radiusKm),
        {
          propertyType: propertyType as PropertyType,
          minValuation: minValuation ? Number(minValuation) : undefined,
          maxValuation: maxValuation ? Number(maxValuation) : undefined,
        }
      );
      res.json({ count: properties.length, properties });
      return;
    }

    const properties = await databaseManager.property.searchProperties({
      propertyType: propertyType as PropertyType,
      minValuation: minValuation ? Number(minValuation) : undefined,
      maxValuation: maxValuation ? Number(maxValuation) : undefined,
      spvId: spvId as string,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.json({ count: properties.length, properties });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get property by ID
router.get('/properties/:id', async (req: Request, res: Response) => {
  try {
    const property = await databaseManager.property.getProperty(req.params.id);
    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }
    res.json(property);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create property
router.post('/properties', async (req: Request, res: Response) => {
  try {
    const { address, title, latitude, longitude, parcelId, propertyType, unitsCount, spvId, assessedValuation, squareFeet } = req.body;
    if (!address || !title || latitude === undefined || longitude === undefined || !parcelId) {
      res.status(400).json({ error: 'Missing required fields: address, title, latitude, longitude, parcelId' });
      return;
    }

    const property = await databaseManager.property.saveProperty({
      address,
      title,
      latitude: Number(latitude),
      longitude: Number(longitude),
      parcelId,
      propertyType: (propertyType as PropertyType) ?? 'RESIDENTIAL',
      unitsCount: Number(unitsCount ?? 1),
      spvId,
      assessedValuation: assessedValuation ? Number(assessedValuation) : undefined,
      squareFeet: squareFeet ? Number(squareFeet) : undefined,
    });

    res.status(201).json(property);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List SPVs
router.get('/spvs', async (_req: Request, res: Response) => {
  try {
    const spvs = await databaseManager.property.listSPVs();
    res.json({ count: spvs.length, spvs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create SPV
router.post('/spvs', async (req: Request, res: Response) => {
  try {
    const { name, entityType, jurisdiction, registrationNumber, taxId, registeredAgent } = req.body;
    if (!name || !jurisdiction || !registrationNumber) {
      res.status(400).json({ error: 'Missing required fields: name, jurisdiction, registrationNumber' });
      return;
    }

    const spv = await databaseManager.property.createSPV({
      name,
      entityType,
      jurisdiction,
      registrationNumber,
      taxId,
      registeredAgent,
    });

    res.status(201).json(spv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// LAYER 2: LEGAL / DOCUMENT DATABASE (PostgreSQL + Object Storage)
// ============================================================================

// List documents
router.get('/documents', async (req: Request, res: Response) => {
  try {
    const { assetId, spvId, investorWallet, documentType } = req.query;
    const documents = await databaseManager.documents.listDocuments({
      assetId: assetId as string,
      spvId: spvId as string,
      investorWallet: investorWallet as string,
      documentType: documentType as LegalDocumentType,
    });
    res.json({ count: documents.length, documents });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload & register document (deeds, title, leases, contracts, KYC/KYB)
router.post('/documents', async (req: Request, res: Response) => {
  try {
    const { assetId, spvId, investorWallet, documentType, title, fileName, fileContentBase64, mimeType } = req.body;
    if (!documentType || !title || !fileName || !fileContentBase64) {
      res.status(400).json({ error: 'Missing required fields: documentType, title, fileName, fileContentBase64' });
      return;
    }

    const buffer = Buffer.from(fileContentBase64, 'base64');
    const doc = await databaseManager.documents.uploadAndRegisterDocument({
      assetId,
      spvId,
      investorWallet,
      documentType: documentType as LegalDocumentType,
      title,
      fileName,
      mimeType: mimeType ?? 'application/pdf',
      fileBufferOrContent: buffer,
    });

    res.status(201).json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get signed download URL
router.get('/documents/:id/signed-url', async (req: Request, res: Response) => {
  try {
    const expiresInSeconds = req.query.expiresIn ? Number(req.query.expiresIn) : 3600;
    const signedUrlData = await databaseManager.documents.getSignedDocumentUrl(req.params.id, expiresInSeconds);
    if (!signedUrlData) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    res.json(signedUrlData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Verify document integrity
router.post('/documents/:id/verify', async (req: Request, res: Response) => {
  try {
    const verification = await databaseManager.documents.verifyDocumentIntegrity(req.params.id);
    res.json(verification);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// LAYER 3: INVESTOR DATABASE (PostgreSQL)
// ============================================================================

// List investors
router.get('/investors', async (req: Request, res: Response) => {
  try {
    const { jurisdiction, accreditationStatus, kycStatus } = req.query;
    const investors = await databaseManager.investors.listInvestors({
      jurisdiction: jurisdiction as string,
      accreditationStatus: accreditationStatus as AccreditationStatus,
      kycStatus: kycStatus as KycStatus,
    });
    res.json({ count: investors.length, investors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get investor profile by wallet
router.get('/investors/:wallet', async (req: Request, res: Response) => {
  try {
    const investor = await databaseManager.investors.getInvestorByWallet(req.params.wallet);
    if (!investor) {
      res.status(404).json({ error: 'Investor not found' });
      return;
    }
    res.json(investor);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upsert investor profile
router.post('/investors', async (req: Request, res: Response) => {
  try {
    const { walletAddress, fullName, email, investorType, primaryJurisdiction, taxIdNumber, taxClassification } = req.body;
    if (!walletAddress || !fullName || !primaryJurisdiction) {
      res.status(400).json({ error: 'Missing required fields: walletAddress, fullName, primaryJurisdiction' });
      return;
    }

    const profile = await databaseManager.investors.upsertInvestorProfile({
      walletAddress,
      fullName,
      email,
      investorType,
      primaryJurisdiction,
      taxIdNumber,
      taxClassification,
    });

    res.status(200).json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update accreditation status
router.post('/investors/:wallet/accreditation', async (req: Request, res: Response) => {
  try {
    const { accreditationStatus, evidenceRef, validDays } = req.body;
    if (!accreditationStatus) {
      res.status(400).json({ error: 'accreditationStatus is required' });
      return;
    }

    const profile = await databaseManager.investors.updateAccreditation(
      req.params.wallet,
      accreditationStatus as AccreditationStatus,
      evidenceRef,
      validDays ? Number(validDays) : 365
    );

    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update KYC/KYB status
router.post('/investors/:wallet/kyc', async (req: Request, res: Response) => {
  try {
    const { kycStatus, kybStatus, amlRating } = req.body;
    if (!kycStatus) {
      res.status(400).json({ error: 'kycStatus is required' });
      return;
    }

    const profile = await databaseManager.investors.updateKycStatus(
      req.params.wallet,
      kycStatus as KycStatus,
      kybStatus,
      amlRating
    );

    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// LAYER 4: TOKENIZATION DATABASE (PostgreSQL)
// ============================================================================

// Get token details & supply
router.get('/tokenization/tokens/:idOrSymbol', async (req: Request, res: Response) => {
  try {
    const token = await databaseManager.tokenization.getToken(req.params.idOrSymbol);
    if (!token) {
      res.status(404).json({ error: 'Token not found' });
      return;
    }
    res.json(token);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Cap Table summary
router.get('/tokenization/tokens/:idOrSymbol/cap-table', async (req: Request, res: Response) => {
  try {
    const capTable = await databaseManager.tokenization.getCapTableSummary(req.params.idOrSymbol);
    res.json(capTable);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Cap Table allocation
router.post('/tokenization/tokens/:idOrSymbol/cap-table', async (req: Request, res: Response) => {
  try {
    const { investorWallet, balanceChange, absoluteBalance, lockedBalance } = req.body;
    if (!investorWallet) {
      res.status(400).json({ error: 'investorWallet is required' });
      return;
    }

    const updatedCapTable = await databaseManager.tokenization.updateCapTableAllocation({
      tokenId: req.params.idOrSymbol,
      investorWallet,
      balanceChange: balanceChange !== undefined ? BigInt(balanceChange) : undefined,
      absoluteBalance: absoluteBalance !== undefined ? BigInt(absoluteBalance) : undefined,
      lockedBalance: lockedBalance !== undefined ? BigInt(lockedBalance) : undefined,
    });

    res.json(updatedCapTable);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List issuances
router.get('/tokenization/tokens/:idOrSymbol/issuances', async (req: Request, res: Response) => {
  try {
    const token = await databaseManager.tokenization.getToken(req.params.idOrSymbol);
    if (!token) {
      res.status(404).json({ error: 'Token not found' });
      return;
    }
    const issuances = await databaseManager.tokenization.listIssuances(token.id);
    res.json({ count: issuances.length, issuances });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create issuance tranche
router.post('/tokenization/tokens/:idOrSymbol/issuances', async (req: Request, res: Response) => {
  try {
    const token = await databaseManager.tokenization.getToken(req.params.idOrSymbol);
    if (!token) {
      res.status(404).json({ error: 'Token not found' });
      return;
    }

    const { trancheName, targetRaiseUsd, minimumRaiseUsd, tokenPriceUsd, tokensOffered, spvId } = req.body;
    if (!trancheName || !targetRaiseUsd || !tokenPriceUsd || !tokensOffered) {
      res.status(400).json({ error: 'Missing required fields: trancheName, targetRaiseUsd, tokenPriceUsd, tokensOffered' });
      return;
    }

    const tranche = await databaseManager.tokenization.createIssuanceTranche({
      tokenId: token.id,
      spvId: spvId ?? token.spvId ?? undefined,
      trancheName,
      targetRaiseUsd: Number(targetRaiseUsd),
      minimumRaiseUsd: Number(minimumRaiseUsd ?? targetRaiseUsd * 0.5),
      tokenPriceUsd: Number(tokenPriceUsd),
      tokensOffered: String(tokensOffered),
    });

    res.status(201).json(tranche);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// LAYER 5: BLOCKCHAIN INDEXER DATABASE (The Graph Indexer)
// ============================================================================

// Get wallet balance for a token
router.get('/indexer/balances/:tokenAddress/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { tokenAddress, walletAddress } = req.params;
    const balance = await databaseManager.indexer.getWalletBalance(tokenAddress, walletAddress);
    if (!balance) {
      res.status(404).json({ error: 'Balance snapshot not found' });
      return;
    }
    res.json(balance);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update or index a wallet balance
router.post('/indexer/balances', async (req: Request, res: Response) => {
  try {
    const { tokenAddress, walletAddress, balance, lockedBalance, blockNumber } = req.body;
    if (!tokenAddress || !walletAddress || balance === undefined) {
      res.status(400).json({ error: 'Missing required fields: tokenAddress, walletAddress, balance' });
      return;
    }

    const snapshot = await databaseManager.indexer.updateWalletBalance(
      tokenAddress,
      walletAddress,
      String(balance),
      lockedBalance ? String(lockedBalance) : '0',
      blockNumber ? Number(blockNumber) : 0
    );

    res.status(200).json(snapshot);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List token transfers
router.get('/indexer/transfers', async (req: Request, res: Response) => {
  try {
    const { tokenAddress, walletAddress, fromAddress, toAddress, limit, offset } = req.query;
    const transfers = await databaseManager.indexer.getTransferHistory({
      tokenAddress: tokenAddress as string,
      walletAddress: walletAddress as string,
      fromAddress: fromAddress as string,
      toAddress: toAddress as string,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.json({ count: transfers.length, transfers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Record a token transfer
router.post('/indexer/transfers', async (req: Request, res: Response) => {
  try {
    const { chainId, tokenAddress, fromAddress, toAddress, amount, transactionHash, blockNumber } = req.body;
    if (!tokenAddress || !fromAddress || !toAddress || !amount || !transactionHash || blockNumber === undefined) {
      res.status(400).json({ error: 'Missing required fields: tokenAddress, fromAddress, toAddress, amount, transactionHash, blockNumber' });
      return;
    }

    const transfer = await databaseManager.indexer.recordTransfer({
      chainId: chainId ? Number(chainId) : 11155111,
      tokenAddress,
      fromAddress,
      toAddress,
      amount: String(amount),
      transactionHash,
      blockNumber: Number(blockNumber),
      blockTimestamp: new Date().toISOString(),
    });

    res.status(201).json(transfer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Query contract events
router.get('/indexer/events', async (req: Request, res: Response) => {
  try {
    const { contractAddress, eventName, fromBlock, limit } = req.query;
    const events = await databaseManager.indexer.getContractEvents({
      contractAddress: contractAddress as string,
      eventName: eventName as string,
      fromBlock: fromBlock ? Number(fromBlock) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json({ count: events.length, events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// The Graph Subgraph GraphQL Proxy
router.post('/indexer/graphql', async (req: Request, res: Response) => {
  try {
    const { query, variables } = req.body;
    if (!query) {
      res.status(400).json({ error: 'query is required' });
      return;
    }
    const result = await databaseManager.indexer.executeSubgraphGraphQL(query, variables);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// LAYER 6: ANALYTICS DATABASE (PostgreSQL / ClickHouse)
// ============================================================================

// Get NAV history & current NAV
router.get('/analytics/nav/:tokenId', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 30;
    const history = await databaseManager.analytics.getNavHistory(req.params.tokenId, limit);
    const latest = history.length > 0 ? history[0] : null;
    res.json({ tokenId: req.params.tokenId, latest, history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Record a new NAV snapshot
router.post('/analytics/nav', async (req: Request, res: Response) => {
  try {
    const { tokenId, propertyId, totalAssetValuationUsd, totalLiabilitiesUsd, totalTokenSupply, valuationMethod } = req.body;
    if (!tokenId || totalAssetValuationUsd === undefined || !totalTokenSupply) {
      res.status(400).json({ error: 'Missing required fields: tokenId, totalAssetValuationUsd, totalTokenSupply' });
      return;
    }

    const snapshot = await databaseManager.analytics.recordNavSnapshot({
      tokenId,
      propertyId,
      totalAssetValuationUsd: Number(totalAssetValuationUsd),
      totalLiabilitiesUsd: totalLiabilitiesUsd ? Number(totalLiabilitiesUsd) : 0,
      totalTokenSupply: String(totalTokenSupply),
      valuationMethod,
    });

    res.status(201).json(snapshot);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get rental yield metrics for a property
router.get('/analytics/yield/:propertyId', async (req: Request, res: Response) => {
  try {
    const rentalYield = await databaseManager.analytics.getRentalYield(req.params.propertyId);
    if (!rentalYield) {
      res.status(404).json({ error: 'Rental yield metrics not found for this property' });
      return;
    }
    res.json(rentalYield);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Record rental yield metrics
router.post('/analytics/yield', async (req: Request, res: Response) => {
  try {
    const { propertyId, tokenId, grossAnnualRentUsd, annualOperatingExpensesUsd, propertyValuationUsd, occupancyRatePct } = req.body;
    if (!propertyId || grossAnnualRentUsd === undefined || !propertyValuationUsd) {
      res.status(400).json({ error: 'Missing required fields: propertyId, grossAnnualRentUsd, propertyValuationUsd' });
      return;
    }

    const metric = await databaseManager.analytics.recordRentalYield({
      propertyId,
      tokenId,
      grossAnnualRentUsd: Number(grossAnnualRentUsd),
      annualOperatingExpensesUsd: Number(annualOperatingExpensesUsd ?? 0),
      propertyValuationUsd: Number(propertyValuationUsd),
      occupancyRatePct: occupancyRatePct ? Number(occupancyRatePct) : 100,
    });

    res.status(201).json(metric);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get distributions analytics
router.get('/analytics/distributions/:tokenId', async (req: Request, res: Response) => {
  try {
    const distributions = await databaseManager.analytics.getDistributionHistory(req.params.tokenId);
    res.json({ count: distributions.length, distributions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Record distribution metric
router.post('/analytics/distributions', async (req: Request, res: Response) => {
  try {
    const { tokenId, periodLabel, totalDistributedUsdc, distributionRatePerToken, annualizedYieldPct, recipientCount, merkleRoot } = req.body;
    if (!tokenId || !periodLabel || totalDistributedUsdc === undefined || !distributionRatePerToken) {
      res.status(400).json({ error: 'Missing required fields: tokenId, periodLabel, totalDistributedUsdc, distributionRatePerToken' });
      return;
    }

    const dist = await databaseManager.analytics.recordDistributionMetric({
      tokenId,
      periodLabel,
      totalDistributedUsdc: Number(totalDistributedUsdc),
      distributionRatePerToken: Number(distributionRatePerToken),
      annualizedYieldPct: Number(annualizedYieldPct ?? 10.0),
      recipientCount: Number(recipientCount ?? 0),
      merkleRoot,
    });

    res.status(201).json(dist);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get secondary market liquidity metrics
router.get('/analytics/liquidity/:tokenId', async (req: Request, res: Response) => {
  try {
    const liquidity = await databaseManager.analytics.getLiquidityMetrics(req.params.tokenId);
    if (!liquidity) {
      res.status(404).json({ error: 'Liquidity metrics not found for this token' });
      return;
    }
    res.json(liquidity);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Record liquidity metrics
router.post('/analytics/liquidity', async (req: Request, res: Response) => {
  try {
    const { tokenId, volume24hUsd, tradesCount24h, turnoverRatePct, bidAskSpreadPct, orderBookDepthUsd } = req.body;
    if (!tokenId || volume24hUsd === undefined) {
      res.status(400).json({ error: 'Missing required fields: tokenId, volume24hUsd' });
      return;
    }

    const metric = await databaseManager.analytics.recordLiquidityMetrics({
      tokenId,
      volume24hUsd: Number(volume24hUsd),
      tradesCount24h: Number(tradesCount24h ?? 0),
      turnoverRatePct: Number(turnoverRatePct ?? 0),
      bidAskSpreadPct: bidAskSpreadPct ? Number(bidAskSpreadPct) : undefined,
      orderBookDepthUsd: orderBookDepthUsd ? Number(orderBookDepthUsd) : undefined,
    });

    res.status(201).json(metric);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get investor cohort analytics
router.get('/analytics/investors', async (req: Request, res: Response) => {
  try {
    const tokenId = req.query.tokenId as string | undefined;
    const metrics = await databaseManager.analytics.getInvestorMetrics(tokenId);
    res.json(metrics ?? { totalActiveInvestors: 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

