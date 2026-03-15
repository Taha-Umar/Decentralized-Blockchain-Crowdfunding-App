// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// We create an "interface" so this contract knows how to talk to your KYC contract
interface IKYCRegistry {
    function checkKycStatus(address _userAddress) external view returns (bool);
}

contract Crowdfunding_Taha {
    // This connects us to the KYC contract
    IKYCRegistry public kycContract;
    address public admin;

    // These are the possible states for a campaign
    enum CampaignStatus { Active, Completed, Withdrawn }

    // This struct holds all the details for a single campaign
    struct Campaign {
        string title;
        string description;
        uint256 goal;
        uint256 fundsRaised;
        address creator;
        CampaignStatus status;
        
    }

    // A mapping to store all campaigns by an ID number
    mapping(uint256 => Campaign) public campaigns;
    
    // Keeps track of the total number of campaigns created
    uint256 public campaignCount;

    // Events to log important actions on the blockchain
    event CampaignCreated(uint256 campaignId, address creator, string title, uint256 goal);
    event ContributionMade(uint256 campaignId, address contributor, uint256 amount);
    event FundsWithdrawn(uint256 campaignId, address creator, uint256 amount);

    // When we deploy this contract, we must tell it where the KYC contract lives
    constructor(address _kycContractAddress) {
        kycContract = IKYCRegistry(_kycContractAddress);
        admin = msg.sender;
    }

    // 1. Create a Campaign
    function createCampaign(string memory _title, string memory _description, uint256 _goal) public {
        // Only verified users can create campaigns
        require(kycContract.checkKycStatus(msg.sender), "User is not verified by KYC");
        require(_goal > 0, "Goal must be greater than 0");

        campaigns[campaignCount] = Campaign({
            title: _title,
            description: _description,
            goal: _goal,
            fundsRaised: 0,
            creator: msg.sender,
            status: CampaignStatus.Active
        });

        // Emit the event required by your assignment
        emit CampaignCreated(campaignCount, msg.sender, _title, _goal);
        
        campaignCount++;
    }

    // 2. Contribute to a Campaign
    function contribute(uint256 _campaignId) public payable {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.status == CampaignStatus.Active, "Campaign is not active");
        require(msg.value > 0, "Contribution must be greater than 0");

        // NEW: Check that the contribution doesn't exceed the remaining goal
        require(campaign.fundsRaised + msg.value <= campaign.goal, "Contribution exceeds the campaign goal");

        // Update funds raised in real time
        campaign.fundsRaised += msg.value;
        emit ContributionMade(_campaignId, msg.sender, msg.value);

        // Automatically mark as completed if the goal is exactly reached
        if (campaign.fundsRaised == campaign.goal) {
            campaign.status = CampaignStatus.Completed;
        }
    }

    // 3. Withdraw Funds
    function withdrawFunds(uint256 _campaignId) public {
        Campaign storage campaign = campaigns[_campaignId];
        
        require(campaign.creator == msg.sender, "Only the campaign creator can withdraw");
        require(campaign.status == CampaignStatus.Completed, "Campaign goal not reached yet");

        // Update status to Withdrawn before sending money (security best practice)
        campaign.status = CampaignStatus.Withdrawn;
        uint256 amount = campaign.fundsRaised;
        
        // Send the ETH to the creator
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(_campaignId, msg.sender, amount);
    }

    // 4. Helper function to get all campaigns for the React frontend later
    function getAllCampaigns() public view returns (Campaign[] memory) {
        Campaign[] memory allCampaigns = new Campaign[](campaignCount);
        for (uint256 i = 0; i < campaignCount; i++) {
            allCampaigns[i] = campaigns[i];
        }
        return allCampaigns;
    }

    function deleteCampaign(uint256 _campaignId) public {
    require(msg.sender == admin, "Only the admin can delete campaigns");
    delete campaigns[_campaignId]; // This wipes the campaign data from the blockchain
}

}