"use client";

import { useState } from "react";

import { Form, message } from "antd";

import { useRouter } from "next/navigation";

import PricingSettingsForm from "@/components/rate-admin/PricingSettingsForm";

import {
  createPricingSettingsVersion,
  getDefaultPricingSettings,
} from "@/services/adminPricingConfigurationService";

import {
  buildPricingPayload,
  DEFAULT_PRICING_VALUES,
  pricingErrorMessage,
  toPricingFormValues,
} from "@/lib/pricing-settings-utils";

export default function NewPricingSettingsPage() {
  const router = useRouter();
  const [form] = Form.useForm();

  const [saving, setSaving] = useState(false);

  const [loadingDefaults, setLoadingDefaults] = useState(false);

  const loadDefaults = async () => {
    try {
      setLoadingDefaults(true);

      const defaults = await getDefaultPricingSettings();

      form.setFieldsValue(toPricingFormValues(defaults));

      message.success("Default pricing values loaded.");
    } catch (error) {
      message.error(
        pricingErrorMessage(error, "Could not load default values."),
      );
    } finally {
      setLoadingDefaults(false);
    }
  };

  const save = async (activate) => {
    try {
      const values = await form.validateFields();

      setSaving(true);

      const created = await createPricingSettingsVersion(
        buildPricingPayload(values, activate),
      );

      message.success(
        activate
          ? "Pricing version saved and activated."
          : "Pricing version saved.",
      );

      router.push(created?.id ? `/admin/rates/${created.id}` : "/admin/rates");
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      message.error(
        pricingErrorMessage(error, "Could not save the pricing version."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <PricingSettingsForm
      form={form}
      initialValues={DEFAULT_PRICING_VALUES}
      title="Add Pricing Version"
      subtitle="Create global pricing rules used after the route base rate."
      saving={saving}
      loadingDefaults={loadingDefaults}
      onLoadDefaults={loadDefaults}
      onCancel={() => router.push("/admin/rates")}
      onSave={save}
    />
  );
}
