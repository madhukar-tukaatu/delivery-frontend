// Use these changes in your existing onboarding page.
// Your current onboarding page already has most of this structure.

// 1) Add this button import:
// import { HomeOutlined } from "@ant-design/icons";

// 2) Add this helper inside MerchantOnboardingPage, after forms are created:
const fillPickupFromBusiness = () => {
  const business = businessForm.getFieldsValue();

  pickupForm.setFieldsValue({
    name: pickupForm.getFieldValue("name") || "Default Pickup Location",
    contact_person:
      pickupForm.getFieldValue("contact_person") ||
      merchant?.contact_person ||
      merchant?.owner_name ||
      "",
    phone: pickupForm.getFieldValue("phone") || merchant?.phone || "",
    address: business.business_address || merchant?.address || "",
    city: business.city || merchant?.city || "",
    area: business.area || merchant?.area || "",
  });

  pickupForm.setFields([
    { name: "address", errors: [] },
    { name: "city", errors: [] },
    { name: "area", errors: [] },
  ]);

  message.success("Business address copied to pickup location.");
};

// 3) Replace savePickup payload with this:
const savePickup = async (values) => {
  setLoading(true);

  try {
    const payload = {
      name: values.name || "Default Pickup Location",
      contact_person: values.contact_person,
      phone: values.phone,
      address: values.address,
      city: values.city,
      area: values.area,
      latitude: values.latitude || null,
      longitude: values.longitude || null,
      is_default: true,
    };

    await savePickupLocation(payload);

    message.success("Default pickup location saved.");
    await load();
    setCurrent(2);
  } catch (error) {
    applyValidationErrors(pickupForm, error);
  } finally {
    setLoading(false);
  }
};

// 4) Change Pickup card start to this:
<Card
  title="Default Pickup Location"
  extra={
    <Button icon={<HomeOutlined />} onClick={fillPickupFromBusiness}>
      Use Business Address
    </Button>
  }
>
  <Alert
    type="info"
    showIcon
    style={{ marginBottom: 16 }}
    message="This location will be auto-selected during shipment creation"
    description="Add the exact warehouse/shop pickup address and pin it on the map. The nearest branch/sub-branch assignment uses this location."
  />

  {/* keep your existing pickup form here */}
</Card>

// 5) In final submit step, disable submit if pickup is missing:
<Button
  type="primary"
  loading={loading}
  onClick={submitReview}
  disabled={missingDocuments.length > 0 || !merchant?.pickup_location || isApproved || isSubmitted}
>
  Submit for Verification
</Button>
