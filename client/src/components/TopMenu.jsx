import React, { useState } from 'react';
import {
  Navbar, NavbarBrand, NavbarToggler, Collapse, Nav, NavItem, NavLink,
  UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, Badge,
} from 'reactstrap';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../features/auth/authSlice.js';

const BASE_TABS = [
  { key: 'daily', label: 'Daily Sales' },
  { key: 'pumps', label: 'Pump Meters' },
  { key: 'payments', label: 'Payments' },
  { key: 'stock', label: 'Tank Stock' },
  { key: 'fuel', label: 'Fuel Margin' },
  { key: 'oil', label: 'Oil & Lubricants' },
  { key: 'oilStock', label: 'Oil Stock' },
  { key: 'deductions', label: 'Deductions' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'summary', label: 'Summary' },
];

export default function TopMenu({ activeTab, setActiveTab }) {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const [isOpen, setIsOpen] = useState(false);

  const tabs = user?.role === 'admin'
    ? [...BASE_TABS, { key: 'admin', label: 'Admin Report' }]
    : BASE_TABS;

  const selectTab = (key) => {
    setActiveTab(key);
    setIsOpen(false); // collapse the menu on mobile after picking a tab
  };

  return (
    <Navbar color="dark" dark expand="md" className="px-3">
      <NavbarBrand href="#" onClick={(e) => e.preventDefault()}>
        Station Profit Tracker
      </NavbarBrand>
      <NavbarToggler onClick={() => setIsOpen((v) => !v)} aria-label="Toggle navigation" />
      <Collapse isOpen={isOpen} navbar>
        <Nav className="me-auto flex-wrap" navbar>
          {tabs.map((t) => (
            <NavItem key={t.key}>
              <NavLink
                href="#"
                active={activeTab === t.key}
                onClick={(e) => {
                  e.preventDefault();
                  selectTab(t.key);
                }}
              >
                {t.label}
              </NavLink>
            </NavItem>
          ))}
        </Nav>
        <UncontrolledDropdown nav inNavbar>
          <DropdownToggle nav caret className="text-white">
            {user?.name}
            {user?.role === 'admin' && (
              <Badge color="warning" className="ms-2 text-dark">Admin</Badge>
            )}
          </DropdownToggle>
          <DropdownMenu end>
            <DropdownItem header>{user?.email}</DropdownItem>
            <DropdownItem divider />
            <DropdownItem onClick={() => dispatch(logout())}>Log out</DropdownItem>
          </DropdownMenu>
        </UncontrolledDropdown>
      </Collapse>
    </Navbar>
  );
}
