"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Card,
  Empty,
  Space,
  Spin,
  Typography,
  message,
} from "antd";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import CoverageLocationForm from "../components/CoverageLocationForm";

import {
  createCoverageLocation,
  getCoverageLocations,
} from "@/services/branchAllocationApi";

import { useAccess } from "@/hooks/useAccess";

const {
  Title,
  Text,
} = Typography;

/*
|--------------------------------------------------------------------------
| Permissions
|--------------------------------------------------------------------------
*/

const PERMISSIONS = {
  CREATE: "coverage_locations.create",
};

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function normalizeRows(response) {
  if (
    Array.isArray(
      response?.data
    )
  ) {
    return response.data;
  }

  if (
    Array.isArray(
      response?.data?.data
    )
  ) {
    return response.data.data;
  }

  return [];
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function CreateCoverageLocationPage() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  /*
  |--------------------------------------------------------------------------
  | Access
  |--------------------------------------------------------------------------
  */

  const {
    can,
    loading: accessLoading,
  } = useAccess();

  const canCreate =
    can(PERMISSIONS.CREATE);

  /*
  |--------------------------------------------------------------------------
  | State
  |--------------------------------------------------------------------------
  */

  const [
    rows,
    setRows,
  ] = useState([]);

  const [
    loadingRows,
    setLoadingRows,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Type
  |--------------------------------------------------------------------------
  */

  const type =
    searchParams.get(
      "type"
    ) ||
    "main_branch_zone";

  /*
  |--------------------------------------------------------------------------
  | Initial values
  |--------------------------------------------------------------------------
  */

  const initialValues =
    useMemo(
      () => ({
        type,

        country:
          "Nepal",

        coverage_radius_km:
          type ===
          "sub_branch_zone"
            ? 3
            : 5,

        status:
          "active",

        is_hq_managed:
          true,
      }),
      [type]
    );

  /*
  |--------------------------------------------------------------------------
  | Main zones
  |--------------------------------------------------------------------------
  */

  const mainZones =
    useMemo(
      () =>
        rows.filter(
          (item) =>
            item.type ===
            "main_branch_zone"
        ),
      [rows]
    );

  /*
  |--------------------------------------------------------------------------
  | Load existing locations
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      accessLoading ||
      !canCreate
    ) {
      return;
    }

    let mounted = true;

    async function loadRows() {
      try {
        setLoadingRows(true);

        const response =
          await getCoverageLocations({
            all: 1,
          });

        if (mounted) {
          setRows(
            normalizeRows(
              response
            )
          );
        }
      } catch (error) {
        console.error(
          "LOAD COVERAGE LOCATIONS ERROR:",
          error
        );

        if (mounted) {
          message.error(
            "Could not load existing allocations."
          );
        }
      } finally {
        if (mounted) {
          setLoadingRows(false);
        }
      }
    }

    loadRows();

    return () => {
      mounted = false;
    };
  }, [
    accessLoading,
    canCreate,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Submit
  |--------------------------------------------------------------------------
  */

  async function handleSubmit(
    payload
  ) {
    if (!canCreate) {
      message.warning(
        "You do not have permission to create coverage allocations."
      );

      return;
    }

    try {
      setSaving(true);

      await createCoverageLocation(
        payload
      );

      message.success(
        "Coverage allocation created successfully."
      );

      router.push(
        "/admin/coverage-locations"
      );
    } catch (error) {
      console.error(
        "CREATE COVERAGE LOCATION ERROR:",
        error
      );

      message.error(
        error?.response?.data
          ?.message ||
          "Could not create coverage allocation."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Access loading
  |--------------------------------------------------------------------------
  */

  if (accessLoading) {
    return (
      <div
        style={{
          minHeight:
            "calc(100vh - 70px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Space
          direction="vertical"
          align="center"
        >
          <Spin size="large" />

          <Text type="secondary">
            Checking permissions...
          </Text>
        </Space>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | No create permission
  |--------------------------------------------------------------------------
  */

  if (!canCreate) {
    return (
      <div
        style={{
          padding: 40,
        }}
      >
        <Card>
          <Empty
            description="You do not have permission to create coverage allocations."
          />
        </Card>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div
      style={{
        background:
          "#ffffff",

        minHeight:
          "100vh",

        padding: 20,
      }}
    >
      <Space
        direction="vertical"
        size={16}
        style={{
          width:
            "100%",
        }}
      >
        <Card>
          <Title
            level={3}
            style={{
              margin: 0,
            }}
          >
            Create Branch Allocation
          </Title>

          <Text type="secondary">
            Add a main branch or
            sub-branch coverage
            allocation.
          </Text>
        </Card>

        {loadingRows ? (
          <Card>
            <div
              style={{
                minHeight: 300,
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
              }}
            >
              <Space
                direction="vertical"
                align="center"
              >
                <Spin />

                <Text type="secondary">
                  Loading existing
                  allocations...
                </Text>
              </Space>
            </div>
          </Card>
        ) : (
          <CoverageLocationForm
            mode="create"
            initialValues={
              initialValues
            }
            mainZones={
              mainZones
            }
            existingLocations={
              rows
            }
            loading={
              saving
            }
            onSubmit={
              handleSubmit
            }
            onCancel={() =>
              router.push(
                "/admin/coverage-locations"
              )
            }
          />
        )}
      </Space>
    </div>
  );
}