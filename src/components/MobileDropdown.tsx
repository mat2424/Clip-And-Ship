
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, User, LogOut, Settings, CreditCard } from "lucide-react";
import { CreditBalance } from "./CreditBalance";
import { Link } from "react-router-dom";

interface MobileDropdownProps {
  user: any;
  onSignOut: () => void;
}

export const MobileDropdown = ({ user, onSignOut }: MobileDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="p-2">
          <Menu className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center space-x-2 p-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground truncate">{user.email}</span>
        </div>
        <DropdownMenuSeparator />
        <div className="p-2">
          <CreditBalance />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/social-connections" className="flex items-center space-x-2 w-full">
            <Settings className="w-4 h-4" />
            <span>Social Connections</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="flex items-center space-x-2 text-red-600">
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
