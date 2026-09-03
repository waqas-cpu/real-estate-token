// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

/**
 * @title RwaMultiSigAdmin
 * @notice Multi-signature administration contract enforcing M-of-N consensus for critical operations.
 * Prevents single-key compromise vulnerabilities for treasury withdrawals, compliance updates, and contract administration.
 */
contract RwaMultiSigAdmin {
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event SubmitTransaction(
        address indexed owner,
        uint256 indexed txIndex,
        address indexed destination,
        uint256 value,
        bytes data
    );
    event ConfirmTransaction(address indexed owner, uint256 indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint256 indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint256 indexed txIndex);
    event OwnerAddition(address indexed owner);
    event OwnerRemoval(address indexed owner);
    event ThresholdChange(uint256 threshold);

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public threshold;

    struct Transaction {
        address destination;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
    }

    // txIndex => owner => bool
    mapping(uint256 => mapping(address => bool)) public isConfirmed;
    Transaction[] public transactions;

    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }

    modifier txExists(uint256 txIndex) {
        require(txIndex < transactions.length, "Transaction does not exist");
        _;
    }

    modifier notExecuted(uint256 txIndex) {
        require(!transactions[txIndex].executed, "Transaction already executed");
        _;
    }

    modifier notConfirmed(uint256 txIndex) {
        require(!isConfirmed[txIndex][msg.sender], "Transaction already confirmed");
        _;
    }

    constructor(address[] memory owners_, uint256 threshold_) {
        require(owners_.length > 0, "Owners required");
        require(threshold_ > 0 && threshold_ <= owners_.length, "Invalid threshold");

        for (uint256 i = 0; i < owners_.length; i++) {
            address owner = owners_[i];
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }

        threshold = threshold_;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    function submitTransaction(
        address destination,
        uint256 value,
        bytes calldata data
    ) external onlyOwner returns (uint256 txIndex) {
        txIndex = transactions.length;

        transactions.push(
            Transaction({
                destination: destination,
                value: value,
                data: data,
                executed: false,
                numConfirmations: 0
            })
        );

        emit SubmitTransaction(msg.sender, txIndex, destination, value, data);

        // Auto-confirm for the submitter
        isConfirmed[txIndex][msg.sender] = true;
        transactions[txIndex].numConfirmations = 1;
        emit ConfirmTransaction(msg.sender, txIndex);

        if (transactions[txIndex].numConfirmations >= threshold) {
            _execute(txIndex);
        }
    }

    function confirmTransaction(
        uint256 txIndex
    ) external onlyOwner txExists(txIndex) notExecuted(txIndex) notConfirmed(txIndex) {
        isConfirmed[txIndex][msg.sender] = true;
        transactions[txIndex].numConfirmations += 1;

        emit ConfirmTransaction(msg.sender, txIndex);

        if (transactions[txIndex].numConfirmations >= threshold) {
            _execute(txIndex);
        }
    }

    function revokeConfirmation(
        uint256 txIndex
    ) external onlyOwner txExists(txIndex) notExecuted(txIndex) {
        require(isConfirmed[txIndex][msg.sender], "Transaction not confirmed");

        isConfirmed[txIndex][msg.sender] = false;
        transactions[txIndex].numConfirmations -= 1;

        emit RevokeConfirmation(msg.sender, txIndex);
    }

    function executeTransaction(
        uint256 txIndex
    ) external onlyOwner txExists(txIndex) notExecuted(txIndex) {
        require(
            transactions[txIndex].numConfirmations >= threshold,
            "Threshold not reached"
        );
        _execute(txIndex);
    }

    function _execute(uint256 txIndex) internal {
        Transaction storage txn = transactions[txIndex];
        txn.executed = true;

        (bool success, bytes memory returnData) = txn.destination.call{value: txn.value}(txn.data);
        if (!success) {
            if (returnData.length > 0) {
                assembly {
                    let returndata_size := mload(returnData)
                    revert(add(32, returnData), returndata_size)
                }
            } else {
                revert("Transaction execution reverted");
            }
        }

        emit ExecuteTransaction(msg.sender, txIndex);
    }

    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    function getTransactionCount() external view returns (uint256) {
        return transactions.length;
    }

    function getTransaction(
        uint256 txIndex
    )
        external
        view
        returns (
            address destination,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 numConfirmations
        )
    {
        Transaction storage txn = transactions[txIndex];
        return (txn.destination, txn.value, txn.data, txn.executed, txn.numConfirmations);
    }
}
