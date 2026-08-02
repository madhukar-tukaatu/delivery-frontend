"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import useRealtimeChannel from "@/hooks/useRealtimeChannel";

// other imports...

export default function BranchOfficesPage() {
  const [filterForm] = Form.useForm();

  const [branches, setBranches] = useState([]);
  const [mapBranches, setMapBranches] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [coverageLocations, setCoverageLocations] = useState([]);

  const [loading, setLoading] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState("table");

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [actionModal, setActionModal] = useState({
    open: false,
    action: null,
    record: null,
    reason: "",
    submitting: false,
  });

  const handleRealtimeBranchChange = useCallback((payload) => {
    const changedBranch = payload?.branch;
    const action = payload?.action;

    if (!changedBranch?.id) {
      return;
    }

    if (action === "deleted") {
      setBranches((current) =>
        current.filter(
          (branch) => branch.id !== changedBranch.id
        )
      );

      setMapBranches((current) =>
        current.filter(
          (branch) => branch.id !== changedBranch.id
        )
      );

      setAllBranches((current) =>
        current.filter(
          (branch) => branch.id !== changedBranch.id
        )
      );

      setPagination((current) => ({
        ...current,
        total: Math.max(0, current.total - 1),
      }));

      message.info(
        `${changedBranch.name || "Branch"} was deleted.`
      );

      return;
    }

    const upsertBranch = (current) => {
      const exists = current.some(
        (branch) => branch.id === changedBranch.id
      );

      if (!exists) {
        return [changedBranch, ...current];
      }

      return current.map((branch) =>
        branch.id === changedBranch.id
          ? {
              ...branch,
              ...changedBranch,
            }
          : branch
      );
    };

    setBranches(upsertBranch);
    setMapBranches(upsertBranch);
    setAllBranches(upsertBranch);

    message.info(
      `${changedBranch.name || "Branch"} was ${action}.`
    );
  }, []);

  useRealtimeChannel({
    channel: "admin.branches",
    event: ".branch.changed",
    onEvent: handleRealtimeBranchChange,
  });

  // all your other useMemo, useEffect, functions and table columns...

  return (
    <div>
      {/* page UI */}
    </div>
  );
}