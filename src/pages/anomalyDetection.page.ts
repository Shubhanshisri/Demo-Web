import { expect, FrameLocator, Locator, Page } from '@playwright/test';

export class AnomalyDetectionPage {
  readonly page: Page;
  readonly app: FrameLocator;
  readonly algorithmDetails: Locator;
  readonly algorithmHeading: Locator;
  readonly sensitivity: Locator;
  readonly costSpikeThreshold: Locator;
  readonly servicesField: Locator;
  readonly services: Locator;
  readonly clearServicesButton: Locator;
  readonly runDetectionButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.app = page.frameLocator('iframe[title="streamlitApp"]');
    this.algorithmDetails = this.app.locator('details').filter({
      hasText: 'Anomaly Detection Method & Algorithm Details',
    });
    this.algorithmHeading = this.app.getByRole('heading', {
      name: 'Detection Algorithm: Z-Score Statistical Analysis',
    });
    this.sensitivity = this.app.getByRole('combobox', { name: 'Detection Sensitivity' });
    this.costSpikeThreshold = this.app.getByRole('slider', { name: 'Cost Spike Threshold (%)' });
    this.servicesField = this.app
      .getByTestId('stMultiSelect')
      .filter({ has: this.app.getByRole('combobox', { name: 'Select Services' }) });
    this.services = this.servicesField.getByRole('combobox', { name: 'Select Services' });
    this.clearServicesButton = this.servicesField.getByRole('button', { name: 'Clear all' });
    this.runDetectionButton = this.app.getByRole('button', { name: 'Run Detection Now' });
  }

  async open() {
    await this.page.goto('https://finops-demo.streamlit.app/', {
      waitUntil: 'domcontentloaded',
    });

    const anomalyDetectionLink = this.app.getByRole('link', {
      name: 'Anomaly Detection',
      exact: true,
    });
    const alertsHeading = this.app.getByRole('heading', { name: 'Anomaly Detection & Alerts' });

    await expect(anomalyDetectionLink).toBeVisible({ timeout: 60_000 });
    await expect(async () => {
      if (!(await alertsHeading.isVisible())) {
        await anomalyDetectionLink.click();
      }
      await expect(this.page).toHaveURL(/\/Anomaly_Detection/, { timeout: 10_000 });
      await expect(alertsHeading).toBeVisible({ timeout: 10_000 });
    }).toPass({ timeout: 60_000 });
  }

  selectedServices() {
    return this.servicesField.getByRole('button', { name: /^Remove / });
  }

  async openAlgorithmDetails() {
    await expect(this.algorithmDetails).toBeVisible();
    const isOpen = await this.algorithmDetails.evaluate(
      (details: HTMLDetailsElement) => details.open
    );
    if (!isOpen) {
      await this.algorithmDetails.locator('summary').click();
    }
  }

  async setSensitivity(value: string) {
    await this.sensitivity.scrollIntoViewIfNeeded();
    await this.sensitivity.click();
    await this.app.getByRole('option', { name: value, exact: true }).click();
  }

  async setCostSpikeThreshold(value: string) {
    await this.costSpikeThreshold.scrollIntoViewIfNeeded();
    await this.costSpikeThreshold.fill(value);
  }

  async selectedServiceNames() {
    return this.selectedServices().evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute('aria-label')?.replace('Remove ', '')).sort()
    );
  }

  async clearServices() {
    await this.services.scrollIntoViewIfNeeded();
    await this.clearServicesButton.click();
  }

  async selectServices(names: string[]) {
    for (const name of names) {
      await this.services.click();
      await this.app.getByRole('option', { name, exact: true }).click();
    }
    await this.services.press('Escape');
  }

  async runDetection() {
    await this.runDetectionButton.scrollIntoViewIfNeeded();
    await this.runDetectionButton.click();
  }

  message(text: string) {
    return this.app.getByText(text);
  }
}
