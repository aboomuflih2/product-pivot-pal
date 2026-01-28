import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminRoute from "@/components/auth/AdminRoute";
import AdminNav from "@/components/admin/AdminNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, Mail, MapPin, ShoppingBag, Eye } from "lucide-react";

interface User {
    user_id: string;
    email: string;
    first_name: string;
    last_name: string;
    created_at: string;
    total_orders: number;
    total_spent: number;
}

interface UserOrder {
    id: string;
    order_number: string;
    total_amount: number;
    status: string;
    created_at: string;
    payment_method: string | null;
    payment_status: string | null;
}

interface UserAddress {
    id: string;
    label: string;
    full_name: string;
    phone: string;
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    is_default: boolean;
}

const UserManagement = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userOrders, setUserOrders] = useState<UserOrder[]>([]);
    const [userAddresses, setUserAddresses] = useState<UserAddress[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredUsers(users);
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredUsers(
                users.filter(
                    (user) =>
                        user.email?.toLowerCase().includes(query) ||
                        user.first_name?.toLowerCase().includes(query) ||
                        user.last_name?.toLowerCase().includes(query)
                )
            );
        }
    }, [searchQuery, users]);

    const fetchUsers = async () => {
        try {
            // @ts-ignore - RPC function defined in database
            const { data, error } = await supabase.rpc("get_all_users_for_admin");

            if (error) throw error;
            const userData = (data || []) as User[];
            setUsers(userData);
            setFilteredUsers(userData);
        } catch (error: any) {
            console.error("Error fetching users:", error);
            toast({
                title: "Error",
                description: "Failed to fetch users. Make sure the RPC function exists.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchUserDetails = async (userId: string) => {
        setDetailsLoading(true);
        try {
            // Fetch user's orders
            const { data: orders, error: ordersError } = await supabase
                .from("orders")
                .select("id, order_number, total_amount, status, created_at, payment_method, payment_status")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });

            if (ordersError) throw ordersError;
            setUserOrders(orders || []);

            // Fetch user's addresses
            const { data: addresses, error: addressesError } = await supabase
                .from("addresses")
                .select("*")
                .eq("user_id", userId)
                .order("is_default", { ascending: false });

            if (addressesError) throw addressesError;
            setUserAddresses(addresses || []);
        } catch (error: any) {
            console.error("Error fetching user details:", error);
            toast({
                title: "Error",
                description: "Failed to fetch user details",
                variant: "destructive",
            });
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleViewUser = async (user: User) => {
        setSelectedUser(user);
        setDialogOpen(true);
        await fetchUserDetails(user.user_id);
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
            pending: "outline",
            processing: "secondary",
            shipped: "default",
            delivered: "default",
            cancelled: "destructive",
        };

        return (
            <Badge variant={variants[status] || "default"}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    return (
        <AdminRoute>
            <div className="min-h-screen flex flex-col">
                <Header />
                <AdminNav />
                <main className="flex-1 container mx-auto px-4 py-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-4">User Management</h1>

                        <div className="flex gap-4 mb-6">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">Loading users...</div>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Registered Users ({filteredUsers.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Joined</TableHead>
                                            <TableHead>Orders</TableHead>
                                            <TableHead>Total Spent</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    No users found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredUsers.map((user) => (
                                                <TableRow key={user.user_id}>
                                                    <TableCell className="font-medium">
                                                        {user.first_name} {user.last_name}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                                            {user.email}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{format(new Date(user.created_at), "MMM dd, yyyy")}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">{user.total_orders}</Badge>
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        ₹{Number(user.total_spent || 0).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleViewUser(user)}
                                                        >
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            View Details
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </main>
                <Footer />

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>User Details</DialogTitle>
                        </DialogHeader>

                        {selectedUser && (
                            <div className="space-y-6">
                                {/* User Info */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg">Profile Information</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">Name</p>
                                                <p className="font-medium">{selectedUser.first_name} {selectedUser.last_name}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Email</p>
                                                <p className="font-medium">{selectedUser.email}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Member Since</p>
                                                <p className="font-medium">{format(new Date(selectedUser.created_at), "PPP")}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Total Spent</p>
                                                <p className="font-medium text-green-600">₹{Number(selectedUser.total_spent || 0).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Order History */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <ShoppingBag className="h-5 w-5" />
                                            Order History ({userOrders.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {detailsLoading ? (
                                            <p className="text-center py-4 text-muted-foreground">Loading...</p>
                                        ) : userOrders.length === 0 ? (
                                            <p className="text-center py-4 text-muted-foreground">No orders placed</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {userOrders.map((order) => (
                                                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                        <div>
                                                            <p className="font-medium">{order.order_number}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {format(new Date(order.created_at), "MMM dd, yyyy")}
                                                            </p>
                                                        </div>
                                                        <div className="text-right flex items-center gap-4">
                                                            <div>
                                                                <p className="font-medium">₹{Number(order.total_amount).toLocaleString()}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {order.payment_method?.toUpperCase()} - {order.payment_status}
                                                                </p>
                                                            </div>
                                                            {getStatusBadge(order.status)}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Saved Addresses */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <MapPin className="h-5 w-5" />
                                            Saved Addresses ({userAddresses.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {detailsLoading ? (
                                            <p className="text-center py-4 text-muted-foreground">Loading...</p>
                                        ) : userAddresses.length === 0 ? (
                                            <p className="text-center py-4 text-muted-foreground">No addresses saved</p>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {userAddresses.map((address) => (
                                                    <div key={address.id} className="p-3 border rounded-lg">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <p className="font-medium">{address.label}</p>
                                                            {address.is_default && (
                                                                <Badge variant="secondary">Default</Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground space-y-0.5">
                                                            <p>{address.full_name}</p>
                                                            <p>{address.phone}</p>
                                                            <p>{address.address_line_1}</p>
                                                            {address.address_line_2 && <p>{address.address_line_2}</p>}
                                                            <p>{address.city}, {address.state} - {address.postal_code}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AdminRoute>
    );
};

export default UserManagement;
