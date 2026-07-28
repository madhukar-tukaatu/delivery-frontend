"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Form,
  Spin,
  message,
} from "antd";

import {
  useParams,
  useRouter,
} from "next/navigation";

import PricingSettingsForm from "@/components/rate-admin/PricingSettingsForm";

import {
  getDefaultPricingSettings,
  getPricingSetting,
  updatePricingSettingsVersion,
} from "@/services/adminPricingConfigurationService";

import {
  buildPricingPayload,
  pricingErrorMessage,
  toPricingFormValues,
} from "@/lib/pricing-settings-utils";

export default function EditPricingSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const [form] = Form.useForm();

  const id = params.id;

  const [record, setRecord] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [loadingDefaults, setLoadingDefaults] =
    useState(false);

  const loadRecord = useCallback(async () => {
    try {
      setLoading(true);

      const result =
        await getPricingSetting(id);

      setRecord(result);

      form.setFieldsValue(
        toPricingFormValues({
          ...result,
          name: `${result.name} – New Version`,
        }),
      );
    } catch (error) {
      message.error(
        pricingErrorMessage(
          error,
          "Could not load the pricing version.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [form, id]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  const loadDefaults = async () => {
    try {
      setLoadingDefaults(true);

      const defaults =
        await getDefaultPricingSettings();

      form.setFieldsValue(
        toPricingFormValues({
          ...defaults,
          name:
            record?.name ||
            defaults.name,
        }),
      );

      message.success(
        "Default values loaded.",
      );
    } catch (error) {
      message.error(
        pricingErrorMessage(
          error,
          "Could not load default values.",
        ),
      );
    } finally {
      setLoadingDefaults(false);
    }
  };

  const save = async (activate) => {
    try {
      const values =
        await form.validateFields();

      setSaving(true);

      const created =
        await updatePricingSettingsVersion(
          id,
          buildPricingPayload(
            values,
            activate,
          ),
        );

      message.success(
        activate
          ? "New pricing version created and activated."
          : "New inactive pricing version created.",
      );

      router.push(
        created?.id
          ? `/admin/rates/${created.id}`
          : "/admin/rates",
      );
    } catch (error) {
      if (error?.errorFields) return;

      message.error(
        pricingErrorMessage(
          error,
          "Could not create the new version.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: 450,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <PricingSettingsForm
      form={form}
      initialValues={
        toPricingFormValues(record)
      }
      title="Create New Pricing Version"
      subtitle={`Based on version #${record?.id}. The historical version will remain unchanged.`}
      loading={saving}
      loadingDefaults={loadingDefaults}
      onLoadDefaults={loadDefaults}
      onCancel={() =>
        router.push(
          `/admin/rates/${id}`,
        )
      }
      onSave={save}
      onSaveAndActivate={() =>
        save(true)
      }
    />
  );
}