// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// REMEMBER TO CHANGE "YourName" TO YOUR ACTUAL NAME!
contract KYCRegistry_Taha {
    // The admin is the person who deploys the contract
    address public admin;

    // This struct holds the data for a user's KYC request
    struct User {
        string name;
        string cnic;
        bool isVerified;
        bool isPending;
    }

    // A "mapping" is like a digital phonebook connecting a wallet address to a User's info
    mapping(address => User) public users;

    // Events are announcements the contract makes when something happens
    event KYCSubmitted(address indexed user, string name, string cnic);
    event KYCApproved(address indexed user);
    event KYCRejected(address indexed user);

    // This modifier restricts certain actions so ONLY the admin can do them
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    // The constructor runs once when the contract is deployed
    constructor() {
        admin = msg.sender; 
    }

    // 1. Users can submit a KYC request (name + CNIC)
    function submitKYC(string memory _name, string memory _cnic) public {
        require(!users[msg.sender].isVerified, "User is already verified");
        users[msg.sender] = User(_name, _cnic, false, true);
        emit KYCSubmitted(msg.sender, _name, _cnic);
    }

    // 2. The admin can approve KYC requests
    function approveKYC(address _userAddress) public onlyAdmin {
        require(users[_userAddress].isPending, "No pending KYC for this user");
        users[_userAddress].isVerified = true;
        users[_userAddress].isPending = false;
        emit KYCApproved(_userAddress);
    }

    // 3. The admin can reject KYC requests
    function rejectKYC(address _userAddress) public onlyAdmin {
        require(users[_userAddress].isPending, "No pending KYC for this user");
        users[_userAddress].isPending = false;
        emit KYCRejected(_userAddress);
    }

    // Helper function to check if someone is verified (Admin is always verified)
    function checkKycStatus(address _userAddress) public view returns (bool) {
        if (_userAddress == admin) {
            return true;
        }
        return users[_userAddress].isVerified;
    }
}