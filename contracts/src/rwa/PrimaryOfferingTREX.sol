// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@erc3643org/erc-3643/contracts/token/IToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @dev USDC primary offering for ERC-3643 (T-REX) tokens with emergency pause and circuit breakers.
contract PrimaryOfferingTREX is Ownable {
    IERC20 public immutable usdc;
    IToken public immutable token;
    uint256 public immutable tokenPriceUsdc;
    uint256 public constant FULL_STAKE_TOKENS = 3_000;
    uint256 public constant DISCOUNT_BPS = 1_000;

    bool public active;
    bool public paused;
    uint256 public totalRaisedUsdc;

    address public emergencyOperator;

    event OfferingActivated();
    event OfferingPaused(address indexed account);
    event OfferingUnpaused(address indexed account);
    event EmergencyOperatorSet(address indexed operator);
    event Subscription(address indexed investor, uint256 tokenAmount, uint256 usdcPaid);

    modifier whenNotPaused() {
        require(!paused, "Offering is paused");
        _;
    }

    constructor(address usdc_, address token_, uint256 tokenPriceUsdc_) {
        require(usdc_ != address(0) && token_ != address(0), "Invalid addresses");
        usdc = IERC20(usdc_);
        token = IToken(token_);
        tokenPriceUsdc = tokenPriceUsdc_;
    }

    function setEmergencyOperator(address operator) external onlyOwner {
        emergencyOperator = operator;
        emit EmergencyOperatorSet(operator);
    }

    function activate() external onlyOwner {
        active = true;
        emit OfferingActivated();
    }

    function pause() external {
        require(
            msg.sender == owner() || (emergencyOperator != address(0) && msg.sender == emergencyOperator),
            "Not authorized to pause"
        );
        paused = true;
        emit OfferingPaused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit OfferingUnpaused(msg.sender);
    }

    function subscribe(uint256 tokenAmount) external whenNotPaused {
        require(active, "Not active");
        require(tokenAmount > 0 && tokenAmount <= FULL_STAKE_TOKENS, "Invalid amount");

        uint256 listUsdc = tokenAmount * tokenPriceUsdc;
        uint256 usdcDue = listUsdc;
        if (tokenAmount == FULL_STAKE_TOKENS) {
            usdcDue = (listUsdc * (10_000 - DISCOUNT_BPS)) / 10_000;
        }

        require(usdc.transferFrom(msg.sender, address(this), usdcDue), "USDC transfer failed");
        require(token.transfer(msg.sender, tokenAmount), "Token transfer failed");

        totalRaisedUsdc += usdcDue;
        emit Subscription(msg.sender, tokenAmount, usdcDue);
    }

    function withdrawUsdc(address to) external onlyOwner {
        require(to != address(0), "Cannot withdraw to zero address");
        uint256 bal = usdc.balanceOf(address(this));
        require(usdc.transfer(to, bal), "Withdraw failed");
    }
}
