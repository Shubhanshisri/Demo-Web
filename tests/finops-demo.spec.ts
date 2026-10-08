import { test, expect } from '../src/fixtures/test.fixture';

test.describe('Anomaly Detection', () => {
  test.describe('Algorithm details', () => {
    test('shows the Z-Score detection algorithm', async ({ anomalyPage }) => {
      await anomalyPage.openAlgorithmDetails();
      await expect(anomalyPage.algorithmHeading).toBeVisible();
    });
  });

  test.describe('Detection Sensitivity', () => {
    test('sets Detection Sensitivity to High', async ({ anomalyPage }) => {
      await anomalyPage.setSensitivity('High');
      await expect(anomalyPage.sensitivity).toHaveValue('High');
    });
  });

  test.describe('Cost Spike Threshold', () => {
    test('changes Cost Spike Threshold from 50 to 100', async ({ anomalyPage }) => {
      await anomalyPage.costSpikeThreshold.scrollIntoViewIfNeeded();
      await expect(anomalyPage.costSpikeThreshold).toHaveValue('50');
      await anomalyPage.setCostSpikeThreshold('100');
      await expect(anomalyPage.costSpikeThreshold).toHaveValue('100');
    });
  });

  test.describe('Select Services', () => {
    test('clears selected services and selects Lambda, CloudWatch and RDS', async ({
      anomalyPage,
    }) => {
      const defaultServices = ['Amazon EC2', 'Amazon S3', 'AWS Lambda', 'Amazon RDS'];
      const servicesToSelect = ['AWS Lambda', 'Amazon CloudWatch', 'Amazon RDS'];

      await anomalyPage.services.scrollIntoViewIfNeeded();
      await expect
        .poll(async () => anomalyPage.selectedServiceNames())
        .toEqual([...defaultServices].sort());

      await anomalyPage.clearServices();
      await expect(anomalyPage.selectedServices()).toHaveCount(0);

      await anomalyPage.selectServices(servicesToSelect);
      await expect
        .poll(async () => anomalyPage.selectedServiceNames())
        .toEqual([...servicesToSelect].sort());
    });
  });

  test.describe('Run Detection Now', () => {
    test('shows the initiated message', async ({ anomalyPage }) => {
      await anomalyPage.runDetection();
      await expect(anomalyPage.message('Anomaly detection initiated!')).toBeVisible({
        timeout: 30_000,
      });
    });
  });
});
