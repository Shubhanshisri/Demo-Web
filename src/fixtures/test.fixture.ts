import { test as base, expect } from '@playwright/test';
import { AnomalyDetectionPage } from '../pages/anomalyDetection.page';

type Pages = {
  anomalyPage: AnomalyDetectionPage;
};

export const test = base.extend<Pages>({
  anomalyPage: [
    async ({ page }, use) => {
      const anomalyPage = new AnomalyDetectionPage(page);
      await anomalyPage.open();
      await use(anomalyPage);
    },
    { timeout: 60_000 },
  ],
});

export { expect };
