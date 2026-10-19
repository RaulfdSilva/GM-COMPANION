import { test } from 'node:test';
import { applicationCases } from './application-cases.ts';
import { domainCases } from './domain-cases.ts';
import { persistenceCases } from './persistence-cases.ts';
for (const scenario of [...domainCases, ...applicationCases, ...persistenceCases]) test(scenario.name, scenario.run);
