import { test } from 'vitest';
import { auditEdgeCases } from './audit-edge-cases.ts';
import { auditMobileCases } from './audit-mobile-cases.ts';
import { auditPersistenceCases } from './audit-persistence-cases.ts';
import { controllerCases } from './controller-cases.ts';
import { auditCases } from './audit-cases.ts';
import { applicationCases } from './application-cases.ts';
import { domainCases } from './domain-cases.ts';
import { persistenceCases } from './persistence-cases.ts';
for (const scenario of [
  ...domainCases,
  ...applicationCases,
  ...persistenceCases,
  ...auditCases,
  ...controllerCases,
  ...auditPersistenceCases,
  ...auditMobileCases,
  ...auditEdgeCases,
])
  test(scenario.name, scenario.run);
