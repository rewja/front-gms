import React from "react";
import AssetManagementTabs from "../admin/AssetManagementTabs";

// Procurement view that mirrors Admin Asset Management UI
// Kept as a separate page so procurement can access combined assets/procurement view
const ProcurementAssetManagement = () => {
  return <AssetManagementTabs />;
};

export default ProcurementAssetManagement;
