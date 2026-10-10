// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title TradingBible Academy Certificates (soulbound)
/// @notice Non-transferable achievement NFTs. Only the minter (expected: the
///         platform backend wallet) can issue/burn. Holders can burn their
///         own. Every transfer except mint/burn reverts.
contract TBECertificate is ERC721 {
    address public minter;
    uint256 private _nextId = 1;

    mapping(uint256 => string) private _uris;

    error OnlyMinter();
    error Soulbound();

    constructor(address minter_) ERC721("TradingBible Certificate", "TBECERT") {
        require(minter_ != address(0), "TBEC: zero minter");
        minter = minter_;
    }

    function award(address to, string calldata uri_) external returns (uint256) {
        if (msg.sender != minter) revert OnlyMinter();
        uint256 id = _nextId++;
        _safeMint(to, id);
        _uris[id] = uri_;
        return id;
    }

    function revoke(uint256 id) external {
        if (msg.sender != minter) revert OnlyMinter();
        _burn(id);
        delete _uris[id];
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        _requireOwned(id);
        return _uris[id];
    }

    function _update(address to, uint256 id, address auth) internal override returns (address) {
        address from = _ownerOf(id);
        // Allow mint (from == 0) and burn (to == 0) only.
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, id, auth);
    }
}
