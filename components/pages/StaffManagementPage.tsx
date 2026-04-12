"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone,
  Mail,
  Star,
  Calendar,
  DollarSign,
  Users,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  Link2Off,
  Building,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  specialty: string;
  company_name?: string;
  experience_years?: number;
  hourly_rate?: number;
  availability: string;
  rating?: number;
  total_jobs?: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  assigned_tenants?: Array<{
    id: string;
    tenant_id: string;
    property_id?: string;
    unit_id?: string;
    assigned_at: string;
    status: string;
    profiles: {
      id: string;
      full_name: string;
      email: string;
      phone: string;
    };
  }>;
  recent_assignments?: Array<{
    id: string;
    title: string;
    status: string;
    created_at?: string;
  }>;
}

interface StaffAssignment {
  id: string;
  tenant_id: string;
  property_id?: string;
  unit_id?: string;
  assigned_at: string;
  status: string;
  profiles?: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  };
}

interface StaffManagementPageProps {
  user: any;
}

const specialties = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "carpentry", label: "Carpentry" },
  { value: "painting", label: "Painting" },
  { value: "hvac", label: "HVAC" },
  { value: "general", label: "General Maintenance" },
  { value: "cleaning", label: "Cleaning" },
  { value: "pest_control", label: "Pest Control" },
  { value: "landscaping", label: "Landscaping" },
  { value: "security", label: "Security" },
  { value: "other", label: "Other" },
];

const availabilityStatus = [
  {
    value: "available",
    label: "Available",
    color: "bg-green-100 text-green-800",
  },
  { value: "busy", label: "Busy", color: "bg-yellow-100 text-yellow-800" },
  {
    value: "unavailable",
    label: "Unavailable",
    color: "bg-red-100 text-red-800",
  },
];

export default function StaffManagementPage({
  user,
}: StaffManagementPageProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [availableTenants, setAvailableTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [assignmentData, setAssignmentData] = useState({
    staff_id: "",
    tenant_id: "",
    property_id: "",
    notes: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [filterAvailability, setFilterAvailability] = useState("all");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    specialty: "",
    company_name: "",
    experience_years: "",
    hourly_rate: "",
    availability: "available",
    notes: "",
  });

  const supabase = createClient();

  useEffect(() => {
    if (user) {
      fetchStaff();
      fetchTenants();
    }
  }, [user]);

  useEffect(() => {
    let filtered = staff;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (staffMember) =>
          staffMember.first_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          staffMember.last_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          staffMember.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          staffMember.phone.includes(searchTerm) ||
          staffMember.specialty
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    // Apply specialty filter
    if (filterSpecialty !== "all") {
      filtered = filtered.filter(
        (staffMember) => staffMember.specialty === filterSpecialty,
      );
    }

    // Apply availability filter
    if (filterAvailability !== "all") {
      filtered = filtered.filter(
        (staffMember) => staffMember.availability === filterAvailability,
      );
    }

    setFilteredStaff(filtered);
  }, [staff, searchTerm, filterSpecialty, filterAvailability]);

  const fetchTenants = async () => {
    try {
      console.log("Starting fetchTenants...");

      // First, let's see what's actually in the requests table
      const { data: allRequests, error: allRequestsError } = await supabase
        .from("requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      console.log("All requests (first 10):", allRequests);
      console.log("All requests error:", allRequestsError);

      // Get unique tenant IDs from requests with pending status
      const { data: requestsData, error: requestsError } = await supabase
        .from("requests")
        .select("tenant_id, status, title")
        .in("status", ["pending", "assigned", "in_progress"]);

      console.log("Pending requests data:", requestsData);
      console.log("Pending requests error:", requestsError);

      // Get unique tenant IDs from complaints with pending status
      const { data: complaintsData, error: complaintsError } = await supabase
        .from("complaints")
        .select("tenant_id, status, title")
        .eq("status", "pending");

      console.log("Pending complaints data:", complaintsData);
      console.log("Pending complaints error:", complaintsError);

      // Combine unique tenant IDs from both requests and complaints
      const requestTenantIds = requestsData?.map((req) => req.tenant_id) || [];
      const complaintTenantIds =
        complaintsData?.map((comp) => comp.tenant_id) || [];
      const uniqueTenantIds = [
        ...new Set([...requestTenantIds, ...complaintTenantIds]),
      ];

      console.log("Request tenant IDs:", requestTenantIds);
      console.log("Complaint tenant IDs:", complaintTenantIds);
      console.log("Unique tenant IDs:", uniqueTenantIds);

      if (uniqueTenantIds.length === 0) {
        console.log(
          "No pending requests or complaints found, no tenants to display",
        );
        setAvailableTenants([]);
        return;
      }

      // Check what's in the profiles table for these tenant IDs
      console.log("Checking profiles for tenant IDs...");
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from("profiles")
        .select("*")
        .limit(10);

      console.log("All profiles (first 10):", allProfiles);
      console.log("All profiles error:", allProfilesError);

      // Now get tenant information from profiles table using these IDs
      const { data: tenantProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone_number, role")
        .in("id", uniqueTenantIds)
        .order("full_name", { ascending: true });

      console.log("Tenant profiles data:", tenantProfiles);
      console.log("Tenant profiles error:", profilesError);

      if (profilesError) {
        console.log("Error fetching tenant profiles:", profilesError);
        // Fallback: try to get from auth.users metadata
        try {
          const tenantData = await Promise.all(
            uniqueTenantIds.map(async (tenantId) => {
              // Try to get user info from profiles first
              const { data: profileData } = await supabase
                .from("profiles")
                .select("id, full_name, email, phone_number")
                .eq("id", tenantId)
                .single();

              if (profileData) {
                return {
                  ...profileData,
                  phone: profileData.phone_number || "No phone available",
                };
              }

              // Fallback to basic info
              return {
                id: tenantId,
                full_name: `Tenant ${tenantId.slice(0, 8)}`,
                email: "No email available",
                phone: "No phone available",
              };
            }),
          );

          setAvailableTenants(tenantData);
        } catch (fallbackError) {
          console.error("Fallback tenant fetch failed:", fallbackError);
          setAvailableTenants([]);
        }
        return;
      }

      // Map phone_number to phone for consistency
      const mappedTenants = (tenantProfiles || []).map((profile) => ({
        ...profile,
        phone: profile.phone_number || "No phone available",
      }));

      console.log(
        `Found ${mappedTenants.length} tenants with pending requests/complaints:`,
        mappedTenants,
      );
      setAvailableTenants(mappedTenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      toast.error("Failed to load tenant data");
      setAvailableTenants([]);
    }
  };

  const fetchStaff = async () => {
    try {
      // First get basic staff data
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (staffError) throw staffError;

      // Then fetch assignments for each staff member
      const staffWithAssignments = await Promise.all(
        (staffData || []).map(async (staffMember) => {
          try {
            // Get staff assignments with tenant info
            let assignments: StaffAssignment[] = [];
            try {
              const { data: assignmentData, error: assignmentError } =
                await supabase
                  .from("staff_assignments")
                  .select(
                    `
                  id,
                  tenant_id,
                  property_id,
                  unit_id,
                  assigned_at,
                  status,
                  profiles!inner(id, full_name, email, phone_number)
                `,
                  )
                  .eq("staff_id", staffMember.id)
                  .eq("status", "active");

              if (!assignmentError) {
                assignments = (assignmentData || []).map((item: any) => ({
                  id: item.id,
                  tenant_id: item.tenant_id,
                  property_id: item.property_id,
                  unit_id: item.unit_id,
                  assigned_at: item.assigned_at,
                  status: item.status,
                  profiles: item.profiles
                    ? {
                        ...item.profiles,
                        phone: item.profiles.phone_number || "No phone",
                      }
                    : {
                        id: item.tenant_id,
                        full_name: "Unknown Tenant",
                        email: "No email",
                        phone: "No phone",
                      },
                }));
              } else {
                console.log(
                  "Assignment query failed, trying without profiles join:",
                  assignmentError,
                );
                // Fallback: get assignments without profiles join
                const { data: fallbackAssignments } = await supabase
                  .from("staff_assignments")
                  .select(
                    "id, tenant_id, property_id, unit_id, assigned_at, status",
                  )
                  .eq("staff_id", staffMember.id)
                  .eq("status", "active");

                // Try to get tenant info for each assignment
                assignments = await Promise.all(
                  (fallbackAssignments || []).map(
                    async (assignment): Promise<StaffAssignment> => {
                      try {
                        const { data: tenantData } = await supabase
                          .from("profiles")
                          .select("id, full_name, email, phone_number")
                          .eq("id", assignment.tenant_id)
                          .single();

                        return {
                          ...assignment,
                          profiles: tenantData
                            ? {
                                ...tenantData,
                                phone: tenantData.phone_number || "No phone",
                              }
                            : {
                                id: assignment.tenant_id,
                                full_name: "Unknown Tenant",
                                email: "No email",
                                phone: "No phone",
                              },
                        };
                      } catch (err) {
                        return {
                          ...assignment,
                          profiles: {
                            id: assignment.tenant_id,
                            full_name: "Unknown Tenant",
                            email: "No email",
                            phone: "No phone",
                          },
                        };
                      }
                    },
                  ),
                );
              }
            } catch (assignmentErr) {
              console.error("Error fetching assignments:", assignmentErr);
              assignments = [];
            }

            // Get recent requests (maintenance requests)
            const { data: recentWork } = await supabase
              .from("requests")
              .select("id, title, status, created_at")
              .eq("assigned_staff_id", staffMember.id)
              .order("created_at", { ascending: false })
              .limit(5);

            return {
              ...staffMember,
              assigned_tenants: assignments || [],
              recent_assignments: recentWork || [],
            };
          } catch (error) {
            console.error(
              `Error fetching details for staff ${staffMember.id}:`,
              error,
            );
            return {
              ...staffMember,
              assigned_tenants: [],
              recent_assignments: [],
            };
          }
        }),
      );

      setStaff(staffWithAssignments);
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast.error("Failed to load staff data");
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToTenant = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from("staff_assignments").insert({
        staff_id: assignmentData.staff_id,
        tenant_id: assignmentData.tenant_id,
        property_id: assignmentData.property_id,
        assigned_by: user?.id,
        notes: assignmentData.notes,
      });

      if (error) throw error;
      toast.success("Staff assigned to tenant successfully");
      setIsAssignDialogOpen(false);
      setAssignmentData({
        staff_id: "",
        tenant_id: "",
        property_id: "",
        notes: "",
      });
      fetchStaff();
    } catch (error) {
      console.error("Error assigning staff:", error);
      toast.error("Failed to assign staff to tenant");
    }
  };

  const handleRemoveAssignment = async (staffId: string, tenantId: string) => {
    if (!confirm("Are you sure you want to remove this assignment?")) return;

    try {
      const { error } = await supabase
        .from("staff_assignments")
        .delete()
        .eq("staff_id", staffId)
        .eq("tenant_id", tenantId);

      if (error) throw error;
      toast.success("Assignment removed successfully");
      fetchStaff();
    } catch (error) {
      console.error("Error removing assignment:", error);
      toast.error("Failed to remove assignment");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const submitData = {
        ...formData,
        experience_years: formData.experience_years
          ? parseInt(formData.experience_years)
          : null,
        hourly_rate: formData.hourly_rate
          ? parseFloat(formData.hourly_rate)
          : null,
      };

      if (editingStaff) {
        // Update existing staff
        const { error } = await supabase
          .from("staff")
          .update(submitData)
          .eq("id", editingStaff.id);

        if (error) throw error;
        toast.success("Staff member updated successfully");
      } else {
        // Add new staff
        const { error } = await supabase.from("staff").insert(submitData);

        if (error) throw error;
        toast.success("Staff member added successfully");
      }

      // Reset form and refresh data
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        specialty: "",
        company_name: "",
        experience_years: "",
        hourly_rate: "",
        availability: "available",
        notes: "",
      });
      setEditingStaff(null);
      setIsAddDialogOpen(false);
      fetchStaff();
    } catch (error) {
      console.error("Error saving staff:", error);
      toast.error("Failed to save staff member");
    }
  };

  const handleEdit = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setFormData({
      first_name: staffMember.first_name,
      last_name: staffMember.last_name,
      email: staffMember.email,
      phone: staffMember.phone,
      specialty: staffMember.specialty,
      company_name: staffMember.company_name || "",
      experience_years: staffMember.experience_years?.toString() || "",
      hourly_rate: staffMember.hourly_rate?.toString() || "",
      availability: staffMember.availability,
      notes: staffMember.notes || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (staffId: string) => {
    if (!confirm("Are you sure you want to remove this staff member?")) return;

    try {
      const { error } = await supabase
        .from("staff")
        .update({ is_active: false })
        .eq("id", staffId);

      if (error) throw error;
      toast.success("Staff member removed successfully");
      fetchStaff();
    } catch (error) {
      console.error("Error deleting staff:", error);
      toast.error("Failed to remove staff member");
    }
  };

  const getAvailabilityBadge = (status: string) => {
    const statusConfig = availabilityStatus.find((s) => s.value === status);
    return (
      <Badge className={statusConfig?.color || "bg-gray-100 text-gray-800"}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getSpecialtyLabel = (specialty: string) => {
    return specialties.find((s) => s.value === specialty)?.label || specialty;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold">Staff Management</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage your maintenance staff and service providers
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              Total: {staff.length}
            </Badge>
            <Badge className="bg-green-100 text-green-800 text-xs">
              Available:{" "}
              {staff.filter((s) => s.availability === "available").length}
            </Badge>
            <Badge className="bg-yellow-100 text-yellow-800 text-xs">
              Busy: {staff.filter((s) => s.availability === "busy").length}
            </Badge>
            <Badge className="bg-blue-100 text-blue-800 text-xs">
              Avg Rating:{" "}
              {staff.length > 0 && staff.filter((s) => s.rating).length > 0
                ? (
                    staff
                      .filter((s) => s.rating)
                      .reduce((acc, s) => acc + s.rating!, 0) /
                    staff.filter((s) => s.rating).length
                  ).toFixed(1)
                : "N/A"}
            </Badge>
          </div>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingStaff(null);
                setFormData({
                  first_name: "",
                  last_name: "",
                  email: "",
                  phone: "",
                  specialty: "",
                  company_name: "",
                  experience_years: "",
                  hourly_rate: "",
                  availability: "available",
                  notes: "",
                });
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingStaff ? "Edit Staff Member" : "Add New Staff Member"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name" className="mb-2">
                    First Name
                  </Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name" className="mb-2">
                    Last Name
                  </Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="mb-2">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="mb-2">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="specialty" className="mb-2">
                    Specialty
                  </Label>
                  <Select
                    value={formData.specialty}
                    onValueChange={(value) =>
                      setFormData({ ...formData, specialty: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialties.map((specialty) => (
                        <SelectItem
                          key={specialty.value}
                          value={specialty.value}
                        >
                          {specialty.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="availability" className="mb-2">
                    Availability
                  </Label>
                  <Select
                    value={formData.availability}
                    onValueChange={(value) =>
                      setFormData({ ...formData, availability: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availabilityStatus.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="company_name" className="mb-2">
                    Company (Optional)
                  </Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData({ ...formData, company_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="experience_years" className="mb-2">
                    Experience (Years)
                  </Label>
                  <Input
                    id="experience_years"
                    type="number"
                    min="0"
                    value={formData.experience_years}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        experience_years: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="hourly_rate" className="mb-2">
                    Hourly Rate (KES)
                  </Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, hourly_rate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes" className="mb-2">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional notes about this staff member..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingStaff ? "Update Staff Member" : "Add Staff Member"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Assignment Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setAssignmentData({
                  staff_id: "",
                  tenant_id: "",
                  property_id: "",
                  notes: "",
                });
              }}
              className="btn-outline text-white gap-2"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Assign Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign Staff to Tenant</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAssignToTenant} className="space-y-4">
              {staff.filter((s) => s.availability === "available").length ===
                0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    No available staff members to assign. Please add staff
                    members or mark existing staff as available.
                  </p>
                </div>
              )}

              {availableTenants.length === 0 &&
                staff.filter((s) => s.availability === "available").length >
                  0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <AlertTriangle className="w-4 h-4 inline mr-2" />
                      No tenants available for assignment. Tenants will appear
                      here when they submit maintenance requests or complaints.
                    </p>
                  </div>
                )}

              {staff.filter((s) => s.availability === "available").length ===
                0 &&
                availableTenants.length === 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">
                      <AlertTriangle className="w-4 h-4 inline mr-2" />
                      No available staff members or tenants with pending
                      requests found. Please add staff members and wait for
                      tenants to submit requests.
                    </p>
                  </div>
                )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="staff_id" className="mb-2">
                    Staff Member
                  </Label>
                  <Select
                    value={assignmentData.staff_id}
                    onValueChange={(value) =>
                      setAssignmentData({ ...assignmentData, staff_id: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.filter((s) => s.availability === "available")
                        .length === 0 ? (
                        <SelectItem value="no-staff" disabled>
                          No available staff
                        </SelectItem>
                      ) : (
                        staff
                          .filter((s) => s.availability === "available")
                          .map((staffMember) => (
                            <SelectItem
                              key={staffMember.id}
                              value={staffMember.id}
                            >
                              {staffMember.first_name} {staffMember.last_name} -{" "}
                              {getSpecialtyLabel(staffMember.specialty)}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tenant_id" className="mb-2">
                    Tenant
                  </Label>
                  <Select
                    value={assignmentData.tenant_id}
                    onValueChange={(value) =>
                      setAssignmentData({ ...assignmentData, tenant_id: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTenants.length === 0 ? (
                        <SelectItem value="no-tenants" disabled>
                          No tenants available
                        </SelectItem>
                      ) : (
                        availableTenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.full_name} ({tenant.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="property_id" className="mb-2">
                  Property/Unit (Optional)
                </Label>
                <Input
                  id="property_id"
                  value={assignmentData.property_id}
                  onChange={(e) =>
                    setAssignmentData({
                      ...assignmentData,
                      property_id: e.target.value,
                    })
                  }
                  placeholder="e.g., Apartment A-101"
                />
              </div>

              <div>
                <Label htmlFor="notes" className="mb-2">
                  Assignment Notes
                </Label>
                <Textarea
                  id="notes"
                  value={assignmentData.notes}
                  onChange={(e) =>
                    setAssignmentData({
                      ...assignmentData,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Special instructions or notes for this assignment..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAssignDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Assignment</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search staff by name, email, phone, or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Specialties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specialties</SelectItem>
              {specialties.map((specialty) => (
                <SelectItem key={specialty.value} value={specialty.value}>
                  {specialty.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterAvailability}
            onValueChange={setFilterAvailability}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {availabilityStatus.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Staff
                </p>
                <p className="text-2xl font-bold">{staff.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Available
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {staff.filter((s) => s.availability === "available").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Busy
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {staff.filter((s) => s.availability === "busy").length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Avg Rating
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {staff.length > 0 && staff.filter((s) => s.rating).length > 0
                    ? (
                        staff
                          .filter((s) => s.rating)
                          .reduce((acc, s) => acc + s.rating!, 0) /
                        staff.filter((s) => s.rating).length
                      ).toFixed(1)
                    : "N/A"}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* --- MOBILE MENU (Visible only on small screens) --- */}
        <div className="block sm:hidden mb-6">
          <label htmlFor="staff-filter" className="sr-only">
            Filter Staff
          </label>
          <select
            id="staff-filter"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full p-3 rounded-lg border-none bg-accent-foreground  shadow-lg focus:ring-2 focus:ring-white/50 appearance-none"
          >
            <option value="all">All Staff ({filteredStaff.length})</option>
            <option value="available">
              Available (
              {
                filteredStaff.filter((s) => s.availability === "available")
                  .length
              }
              )
            </option>
            <option value="busy">
              Busy (
              {filteredStaff.filter((s) => s.availability === "busy").length})
            </option>
          </select>
        </div>
        {/* --- DESKTOP TABS (Hidden on small screens) --- */}
        <TabsList className="hidden sm:flex justify-center bg-accent-foreground rounded-lg p-4 shadow-lg mb-6">
          <TabsTrigger
            value="all"
            className="text-white data-[state=active]:text-white data-[state=active]:bg-sidebar-primary-foreground rounded-full px-8 py-3 transition-all text-base"
          >
            All Staff ({filteredStaff.length})
          </TabsTrigger>

          <TabsTrigger
            value="available"
            className="text-white data-[state=active]:text-white data-[state=active]:bg-green-600 rounded-full px-8 py-3 transition-all text-base"
          >
            Available (
            {filteredStaff.filter((s) => s.availability === "available").length}
            )
          </TabsTrigger>

          <TabsTrigger
            value="busy"
            className="text-white data-[state=active]:text-white data-[state=active]:bg-red-600 rounded-full px-8 py-3 transition-all text-base"
          >
            Busy (
            {filteredStaff.filter((s) => s.availability === "busy").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4">
            {filteredStaff.map((staffMember) => (
              <Card key={staffMember.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                        <h3 className="text-lg font-semibold">
                          {staffMember.first_name} {staffMember.last_name}
                        </h3>
                        <div className="flex items-center gap-2">
                          {getAvailabilityBadge(staffMember.availability)}
                          {staffMember.rating && (
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span className="text-sm">
                                {staffMember.rating.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{staffMember.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{staffMember.phone}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {getSpecialtyLabel(staffMember.specialty)}
                          </span>
                        </div>
                        {staffMember.company_name && (
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span>{staffMember.company_name}</span>
                          </div>
                        )}
                        {staffMember.experience_years && (
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{staffMember.experience_years} years</span>
                          </div>
                        )}
                        {staffMember.hourly_rate && (
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span>KES {staffMember.hourly_rate}/hr</span>
                          </div>
                        )}
                        {staffMember.total_jobs && (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-muted-foreground" />
                            <span>{staffMember.total_jobs} jobs</span>
                          </div>
                        )}
                      </div>

                      {staffMember.notes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {staffMember.notes}
                        </p>
                      )}
                    </div>

                    {/* Tenant Assignments */}
                    {staffMember.assigned_tenants &&
                      staffMember.assigned_tenants.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                          <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Current Assignments (
                            {staffMember.assigned_tenants.length})
                          </h4>
                          <div className="space-y-2">
                            {staffMember.assigned_tenants.map((assignment) => (
                              <div
                                key={assignment.id}
                                className="flex items-center justify-between bg-white rounded p-2 border border-blue-100"
                              >
                                <div className="flex items-center gap-2">
                                  <Building className="w-3 h-3 text-blue-600" />
                                  <div>
                                    <p className="text-sm font-medium">
                                      {assignment.profiles.full_name}
                                    </p>
                                    {assignment.property_id && (
                                      <p className="text-xs text-muted-foreground">
                                        Property: {assignment.property_id}{" "}
                                        {assignment.unit_id &&
                                          `- Unit: ${assignment.unit_id}`}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(
                                      assignment.assigned_at,
                                    ).toLocaleDateString()}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleRemoveAssignment(
                                        staffMember.id,
                                        assignment.id,
                                      )
                                    }
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Link2Off className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Recent Work */}
                    {staffMember.recent_assignments &&
                      staffMember.recent_assignments.length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                          <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Recent Work ({staffMember.recent_assignments.length}
                            )
                          </h4>
                          <div className="space-y-1">
                            {staffMember.recent_assignments
                              .slice(0, 3)
                              .map((assignment) => (
                                <div
                                  key={assignment.id}
                                  className="flex items-center justify-between bg-white rounded p-2 border border-green-100"
                                >
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      {assignment.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge
                                        className={
                                          assignment.status === "completed"
                                            ? "bg-green-100 text-green-800"
                                            : assignment.status ===
                                                "in_progress"
                                              ? "bg-blue-100 text-blue-800"
                                              : "bg-gray-100 text-gray-800"
                                        }
                                      >
                                        {assignment.status}
                                      </Badge>
                                      {assignment.created_at && (
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(
                                            assignment.created_at,
                                          ).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border lg:ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(staffMember)}
                        className="flex-1 sm:flex-none"
                      >
                        <Edit className="w-4 h-4" />
                        <span className="hidden sm:inline ml-2">Edit</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStaff(staffMember);
                          setIsAssignDialogOpen(true);
                          setAssignmentData({
                            staff_id: staffMember.id,
                            tenant_id: "",
                            property_id: "",
                            notes: "",
                          });
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex-1 sm:flex-none"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span className="hidden sm:inline ml-2">Assign</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(staffMember.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-1 sm:flex-none"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline ml-2">Delete</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="available">
          <div className="grid gap-4">
            {filteredStaff
              .filter((s) => s.availability === "available")
              .map((staffMember) => (
                <Card key={staffMember.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            {staffMember.first_name} {staffMember.last_name}
                          </h3>
                          <Badge className="bg-green-100 text-green-800">
                            Available
                          </Badge>
                          {staffMember.rating && (
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span className="text-sm">
                                {staffMember.rating.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span>{staffMember.email}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{staffMember.phone}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {getSpecialtyLabel(staffMember.specialty)}
                            </span>
                          </div>
                          {staffMember.hourly_rate && (
                            <div className="flex items-center space-x-2">
                              <DollarSign className="w-4 h-4 text-muted-foreground" />
                              <span>KES {staffMember.hourly_rate}/hr</span>
                            </div>
                          )}
                          {staffMember.total_jobs && (
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-muted-foreground" />
                              <span>{staffMember.total_jobs} jobs</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(staffMember)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(staffMember.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="busy">
          <div className="grid gap-4">
            {filteredStaff
              .filter((s) => s.availability === "busy")
              .map((staffMember) => (
                <Card key={staffMember.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            {staffMember.first_name} {staffMember.last_name}
                          </h3>
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Busy
                          </Badge>
                          {staffMember.rating && (
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span className="text-sm">
                                {staffMember.rating.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span>{staffMember.email}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{staffMember.phone}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {getSpecialtyLabel(staffMember.specialty)}
                            </span>
                          </div>
                          {staffMember.total_jobs && (
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-muted-foreground" />
                              <span>{staffMember.total_jobs} jobs</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex space-x-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(staffMember)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(staffMember.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
