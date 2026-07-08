// Use these changes in your merchant shipment create page.

// 1) Replace your loadPickupLocations useEffect with this:
useEffect(() => {
  async function loadPickupLocations() {
    try {
      setLoadingPickups(true);

      const rows = await getMerchantPickupLocations();
      const activeRows = (rows || []).filter((row) => {
        const status = String(row.status || "active").toLowerCase();
        return status === "active" || status === "approved" || status === "pending";
      });

      setPickupLocations(activeRows);

      const defaultLocation =
        activeRows.find((row) => row.is_default) ||
        activeRows.find((row) => row.latitude && row.longitude) ||
        activeRows[0];

      if (defaultLocation) {
        form.setFieldsValue({ pickup_location_id: defaultLocation.id });
        form.setFields([{ name: "pickup_location_id", errors: [] }]);
      }
    } catch (error) {
      message.error("Could not load pickup locations.");
    } finally {
      setLoadingPickups(false);
    }
  }

  loadPickupLocations();
}, [form]);

// 2) Add this alert after pickup row:
{!loadingPickups && !selfDrop && pickupLocations.length === 0 && (
  <Alert
    type="error"
    showIcon
    style={{ marginBottom: 16 }}
    message="No pickup location found"
    description="Please complete onboarding and save your default pickup location before creating a shipment."
  />
)}

// 3) Change the pickup field label:
<Form.Item
  name="pickup_location_id"
  label="Auto Selected Merchant Pickup Location"
  rules={[{ required: !selfDrop, message: "Pickup location is required." }]}
>
  <Select
    loading={loadingPickups}
    showSearch
    placeholder="Auto selected from merchant onboarding"
    options={pickupOptions}
    optionFilterProp="label"
  />
</Form.Item>

// 4) Keep this map usage. It is correct:
<DeliveryLocationPicker
  pickupLocation={selectedPickupLocation}
  value={{
    address: deliveryAddress,
    city: deliveryCity,
    area: deliveryArea,
    latitude: deliveryLatitude,
    longitude: deliveryLongitude,
  }}
  onChange={setDeliveryFromMap}
/>
