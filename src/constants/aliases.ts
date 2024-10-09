import { lowerCaseValues } from "./utils.js";


export const ALIASES_ETHEREUM = lowerCaseValues({
    "crv": "0xD533a949740bb3306d119CC777fa900bA034cd52", // <--- CHANGE
    "minter": '0xd061D61a4d941c39E5453435B6345Dc261C2fcE0', // <--- RECOVERED
    "root_gauge_factory": "0x306A45a1478A000dC701A6e1f7a569afb8D9DCD6",
    "root_gauge_factory_arbitrum": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    "voting_escrow": "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2",
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc",
    "fee_distributor_crvusd": "0xD16d5eC345Dd86Fb63C6a9C43c517210F1027914",
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0x16C6521Dff6baB339122a0FE25a9116693265353",
    "deposit_and_stake": "0x56C526b0159a258887e0d79ec3a80dfb940d0cD7", // <--- CHANGE
    "stable_calc": "0x0DCDED3545D565bA3B19E683431381007245d983", // <-- CHANGE
    "crypto_calc": '0xA72C85C258A81761433B4e8da60505Fe3Dd551CC', // <--- CHANGE
    "factory": '0xb9fc157394af804a3578134a6585c0dc9cc990d4', // <--- CHANGE
    "crvusd_factory": '0x4F8846Ae9380B90d2E71D5e3D042dff3E7ebb40d', // <--- CHANGE
    "eywa_factory": '0x37F22A0B028f2152e6CAcef210e0C4d3b875f367', // <--- DUMMY
    "crypto_factory": '0xF18056Bbd320E96A48e3Fbf8bC061322531aac99', // <--- CHANGE
    "twocrypto_factory": '0x98EE851a00abeE0d95D08cF4CA2BdCE32aeaAF7F', // <--- NEW
    "tricrypto_factory": '0x0c0e5f2fF0ff18a3be9b835635039256dC4B4963', // <--- CHANGE
    "stable_ng_factory": '0x6A8cbed756804B16E05E741eDaBd5cB544AE21bf',
    "factory_admin": "",
    "voting_parameter": '0xBCfF8B0b9419b9A88c44546519b1e909cF330399',
    "voting_ownership": '0xE478de485ad2fe566d49342Cbd03E49ed7DB3356',
    "circulating_supply": '0x14139EB676342b6bC8E41E0d419969f23A49881e',
});

export const ALIASES_POLYGON = lowerCaseValues({
    "crv": "0x172370d5cd63279efa6d502dab29171933a610af",
    "child_gauge_factory": "0x55a1C26CE60490A15Bdd6bD73De4F6346525e01e",
    "child_gauge_factory_old": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    "voting_escrow": "0xb5acc710aede048600e10eedcefdf98d4abf4b1e",
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0x0DCDED3545D565bA3B19E683431381007245d983",
    "deposit_and_stake": "0x37c5ab57AF7100Bdc9B668d766e193CCbF6614FD",
    "stable_calc": "0xCA8d0747B5573D69653C3aC22242e6341C36e4b4", // <-- CHANGED
    "crypto_calc": '0xA72C85C258A81761433B4e8da60505Fe3Dd551CC', // <--- NEW
    "factory": '0x722272d36ef0da72ff51c5a65db7b870e2e8d4ee',
    "crvusd_factory": '0x4F8846Ae9380B90d2E71D5e3D042dff3E7ebb40d', // <-- DUMMY
    "eywa_factory": '0x37F22A0B028f2152e6CAcef210e0C4d3b875f367', // <--- DUMMY
    "crypto_factory": "0xE5De15A9C9bBedb4F5EC13B131E61245f2983A69",
    "twocrypto_factory": '0x98EE851a00abeE0d95D08cF4CA2BdCE32aeaAF7F', // <--- NEW
    "tricrypto_factory": '0xC1b393EfEF38140662b91441C6710Aa704973228',
    "stable_ng_factory": '0x1764ee18e8B3ccA4787249Ceb249356192594585',
    "factory_admin": "",
});

export const ALIASES_FANTOM = lowerCaseValues({
    "crv": "0x1E4F97b9f9F913c46F1632781732927B9019C68b",
    "child_gauge_factory": "0x004A476B5B76738E34c86C7144554B9d34402F13",
    "child_gauge_factory_old": "0xDb205f215f568ADf21b9573b62566f6d9a40bed6",
    "voting_escrow": "0xb75dca485e21a77e1b433ecacb74475fc67e259c",
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0x0DCDED3545D565bA3B19E683431381007245d983",
    "deposit_and_stake": "0x37c5ab57AF7100Bdc9B668d766e193CCbF6614FD",
    "stable_calc": "0xCA8d0747B5573D69653C3aC22242e6341C36e4b4", // <-- CHANGED
    "crypto_calc": '0xA72C85C258A81761433B4e8da60505Fe3Dd551CC', // <--- NEW
    "factory": "0x686d67265703d1f124c45e33d47d794c566889ba",
    "crvusd_factory": '0x4F8846Ae9380B90d2E71D5e3D042dff3E7ebb40d', // <-- DUMMY
    "eywa_factory": '0x37F22A0B028f2152e6CAcef210e0C4d3b875f367',
    "crypto_factory": "0xE5De15A9C9bBedb4F5EC13B131E61245f2983A69",
    "twocrypto_factory": '0x98EE851a00abeE0d95D08cF4CA2BdCE32aeaAF7F', // <--- NEW
    "tricrypto_factory": '0x0c0e5f2fF0ff18a3be9b835635039256dC4B4963', // <--- TODO CHANGE
    "stable_ng_factory": '0xe61Fb97Ef6eBFBa12B36Ffd7be785c1F5A2DE66b',
    "factory_admin": "",
});

export const ALIASES_AVALANCHE = lowerCaseValues({
    "crv": "0x47536F17F4fF30e64A96a7555826b8f9e66ec468",
    "child_gauge_factory": "0x97aDC08FA1D849D2C48C5dcC1DaB568B169b0267",
    "child_gauge_factory_old": "0xDb205f215f568ADf21b9573b62566f6d9a40bed6",
    "voting_escrow": "0xc55837710bc500f1e3c7bb9dd1d51f7c5647e657",
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0x0DCDED3545D565bA3B19E683431381007245d983",
    "deposit_and_stake": "0x37c5ab57AF7100Bdc9B668d766e193CCbF6614FD",
    "stable_calc": "0xCA8d0747B5573D69653C3aC22242e6341C36e4b4", // <-- CHANGED
    "crypto_calc": '0xA72C85C258A81761433B4e8da60505Fe3Dd551CC', // <--- NEW
    "factory": '0xb17b674D9c5CB2e441F8e196a2f048A81355d031',
    "crvusd_factory": '0x4F8846Ae9380B90d2E71D5e3D042dff3E7ebb40d', // <-- DUMMY
    "eywa_factory": '0x37F22A0B028f2152e6CAcef210e0C4d3b875f367', // <--- DUMMY
    "crypto_factory": '0xF18056Bbd320E96A48e3Fbf8bC061322531aac99', // <--- TODO CHANGE
    "twocrypto_factory": '0x98EE851a00abeE0d95D08cF4CA2BdCE32aeaAF7F', // <--- NEW
    "tricrypto_factory": '0x0c0e5f2fF0ff18a3be9b835635039256dC4B4963', // <--- TODO CHANGE
    "stable_ng_factory": '0x1764ee18e8B3ccA4787249Ceb249356192594585',
    "factory_admin": "",
});

export const ALIASES_ARBITRUM = lowerCaseValues({
    "crv": "0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978",
    "child_gauge_factory": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    "voting_escrow": "0x98c80fa823759b642c3e02f40533c164f40727ae",
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0x2191718CD32d02B8E60BAdFFeA33E4B5DD9A0A0D",
    "deposit_and_stake": "0x37c5ab57AF7100Bdc9B668d766e193CCbF6614FD",
    "stable_calc": "0xCA8d0747B5573D69653C3aC22242e6341C36e4b4", // <-- CHANGED
    "crypto_calc": '0xA72C85C258A81761433B4e8da60505Fe3Dd551CC', // <--- NEW
    "factory": '0xb17b674D9c5CB2e441F8e196a2f048A81355d031',
    "crvusd_factory": '0x4F8846Ae9380B90d2E71D5e3D042dff3E7ebb40d', // <-- DUMMY
    "eywa_factory": '0x37F22A0B028f2152e6CAcef210e0C4d3b875f367', // <--- DUMMY
    "crypto_factory": '0xF18056Bbd320E96A48e3Fbf8bC061322531aac99', // <--- TODO CHANGE
    "twocrypto_factory": '0x98EE851a00abeE0d95D08cF4CA2BdCE32aeaAF7F', // <--- NEW
    "tricrypto_factory": '0xbC0797015fcFc47d9C1856639CaE50D0e69FbEE8',
    "stable_ng_factory": '0x9AF14D26075f142eb3F292D5065EB3faa646167b',
    "factory_admin": "",
});

export const ALIASES_OPTIMISM = lowerCaseValues({
    "crv": "0x0994206dfE8De6Ec6920FF4D779B0d950605Fb53",
    "child_gauge_factory": "0x871fBD4E01012e2E8457346059e8C189d664DbA4",
    "child_gauge_factory_old": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    "voting_escrow": "0x65a0b01756e837e6670634816e4f5b3a3ff21107",
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0x0DCDED3545D565bA3B19E683431381007245d983",
    "deposit_and_stake": "0x37c5ab57AF7100Bdc9B668d766e193CCbF6614FD",
    "stable_calc": "0xCA8d0747B5573D69653C3aC22242e6341C36e4b4", // <-- CHANGED
    "crypto_calc": '0xA72C85C258A81761433B4e8da60505Fe3Dd551CC',
    "factory": '0x2db0E83599a91b508Ac268a6197b8B14F5e72840',
    "crvusd_factory": '0x4F8846Ae9380B90d2E71D5e3D042dff3E7ebb40d', // <-- DUMMY
    "eywa_factory": '0x37F22A0B028f2152e6CAcef210e0C4d3b875f367', // <--- DUMMY
    "crypto_factory": '0xF18056Bbd320E96A48e3Fbf8bC061322531aac99', // <--- TODO CHANGE
    "twocrypto_factory": '0x98EE851a00abeE0d95D08cF4CA2BdCE32aeaAF7F', // <--- NEW
    "tricrypto_factory": '0xc6C09471Ee39C7E30a067952FcC89c8922f9Ab53',
    "stable_ng_factory": '0x5eeE3091f747E60a045a2E715a4c71e600e31F6E',
    "factory_admin": "",
    "gas_oracle": '0xc0d3C0d3C0d3c0D3C0D3C0d3C0d3C0D3C0D3000f',
    "gas_oracle_blob": '0x420000000000000000000000000000000000000f',
});

export const ALIASES_XDAI = lowerCaseValues({
    "crv": "0x712b3d230f3c1c19db860d80619288b1f0bdd0bd",
    "child_gauge_factory": "0x06471ED238306a427241B3eA81352244E77B004F",
    "child_gauge_factory_old": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    "voting_escrow": "0xefde221f306152971d8e9f181bfe998447975810",
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0x0DCDED3545D565bA3B19E683431381007245d983",
    "deposit_and_stake": "0x37c5ab57AF7100Bdc9B668d766e193CCbF6614FD",
    "stable_calc": "0xCA8d0747B5573D69653C3aC22242e6341C36e4b4", // <-- CHANGED
    "crypto_calc": '0xA72C85C258A81761433B4e8da60505Fe3Dd551CC', // <--- NEW
    "factory": '0xD19Baeadc667Cf2015e395f2B08668Ef120f41F5',
    "crvusd_factory": '0x4F8846Ae9380B90d2E71D5e3D042dff3E7ebb40d', // <-- DUMMY
    "eywa_factory": '0x37F22A0B028f2152e6CAcef210e0C4d3b875f367', // <--- DUMMY
    "crypto_factory": '0xF18056Bbd320E96A48e3Fbf8bC061322531aac99', // <--- TODO CHANGE
    "twocrypto_factory": '0x98EE851a00abeE0d95D08cF4CA2BdCE32aeaAF7F', // <--- NEW
    "tricrypto_factory": '0xb47988aD49DCE8D909c6f9Cf7B26caF04e1445c8',
    "stable_ng_factory": '0xbC0797015fcFc47d9C1856639CaE50D0e69FbEE8', // <--- TODO CHANGE
    "factory_admin": "",
});

export const ALIASES_MOONBEAM = lowerCaseValues({
    "crv": "0x7C598c96D02398d89FbCb9d41Eab3DF0C16F227D",
    "child_gauge_factory": "0xe35A879E5EfB4F1Bb7F70dCF3250f2e19f096bd8",
    "child_gauge_factory_old": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    "voting_escrow": "0x0000000000000000000000000000000000000000",
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0x0000000000000000000000000000000000000000",
    "deposit_and_stake": "0x0000000000000000000000000000000000000000",
    "stable_calc": "0xCA8d0747B5573D69653C3aC22242e6341C36e4b4", // <-- CHANGED
    "crypto_calc": '0xA72C85C258A81761433B4e8da60505Fe3Dd551CC', // <--- NEW
    "factory": '0x4244eB811D6e0Ef302326675207A95113dB4E1F8',
    "crvusd_factory": '0x4F8846Ae9380B90d2E71D5e3D042dff3E7ebb40d', // <-- DUMMY
    "eywa_factory": '0x37F22A0B028f2152e6CAcef210e0C4d3b875f367', // <--- DUMMY
    "crypto_factory": '0xF18056Bbd320E96A48e3Fbf8bC061322531aac99', // <--- TODO CHANGE
    "twocrypto_factory": '0x0000000000000000000000000000000000000000', // <--- NEW
    "tricrypto_factory": '0x0c0e5f2fF0ff18a3be9b835635039256dC4B4963', // <--- TODO CHANGE
    "stable_ng_factory": '0x0000000000000000000000000000000000000000',
    "factory_admin": "",
});

export const ALIASES_AURORA = lowerCaseValues({
    "crv": "0x64D5BaF5ac030e2b7c435aDD967f787ae94D0205",
    "child_gauge_factory": "0xe35A879E5EfB4F1Bb7F70dCF3250f2e19f096bd8", // <-- CHANGED
    "voting_escrow": "0x0000000000000000000000000000000000000000", // <-- DUMMY
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0x0000000000000000000000000000000000000000",
    "deposit_and_stake": "0x0000000000000000000000000000000000000000",
    "stable_calc": "0xCA8d0747B5573D69653C3aC22242e6341C36e4b4", // <-- CHANGED
    "crypto_calc": '0xA72C85C258A81761433B4e8da60505Fe3Dd551CC', // <--- NEW
    "factory": '0xb9fc157394af804a3578134a6585c0dc9cc990d4', // <--- TODO CHANGE
    "crvusd_factory": '0x4F8846Ae9380B90d2E71D5e3D042dff3E7ebb40d', // <-- DUMMY
    "eywa_factory": '0x37F22A0B028f2152e6CAcef210e0C4d3b875f367', // <--- DUMMY
    "crypto_factory": '0xF18056Bbd320E96A48e3Fbf8bC061322531aac99', // <--- TODO CHANGE
    "twocrypto_factory": '0x98EE851a00abeE0d95D08cF4CA2BdCE32aeaAF7F', // <--- NEW
    "tricrypto_factory": '0x0c0e5f2fF0ff18a3be9b835635039256dC4B4963', // <--- TODO CHANGE
    "stable_ng_factory": '0x5eeE3091f747E60a045a2E715a4c71e600e31F6E',
    "factory_admin": "",
});

export const ALIASES_KAVA = lowerCaseValues({
    "crv": "0x64D5BaF5ac030e2b7c435aDD967f787ae94D0205", // <--- TODO CHANGE
    "child_gauge_factory": "0xe35A879E5EfB4F1Bb7F70dCF3250f2e19f096bd8",
    "child_gauge_factory_old": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    "voting_escrow": "0x0000000000000000000000000000000000000000", // <-- DUMMY
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0x0DCDED3545D565bA3B19E683431381007245d983",
    "deposit_and_stake": "0x37c5ab57AF7100Bdc9B668d766e193CCbF6614FD",
    "stable_calc": "0xCA8d0747B5573D69653C3aC22242e6341C36e4b4", // <-- CHANGED
    "crypto_calc": '0xA72C85C258A81761433B4e8da60505Fe3Dd551CC', // <--- NEW
    "factory": '0x40bc62805471eF53DdD5C5cF99ed3d9e5aa81b48',
    "crvusd_factory": '0x4F8846Ae9380B90d2E71D5e3D042dff3E7ebb40d', // <-- DUMMY
    "eywa_factory": '0x37F22A0B028f2152e6CAcef210e0C4d3b875f367', // <--- DUMMY
    "crypto_factory": '0xF18056Bbd320E96A48e3Fbf8bC061322531aac99', // <--- TODO CHANGE
    "twocrypto_factory": '0xd3B17f862956464ae4403cCF829CE69199856e1e', // <--- NEW
    "tricrypto_factory": '0x0c0e5f2fF0ff18a3be9b835635039256dC4B4963', // <--- TODO CHANGE
    "stable_ng_factory": '0x1764ee18e8B3ccA4787249Ceb249356192594585',
    "factory_admin": "",
});

export const ALIASES_CELO = lowerCaseValues({
    "crv": "0x0a7432cF27F1aE3825c313F3C81e7D3efD7639aB", // <--- TODO CHANGE
    "child_gauge_factory": "0xe35A879E5EfB4F1Bb7F70dCF3250f2e19f096bd8",
    "child_gauge_factory_old": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    "voting_escrow": "0x0000000000000000000000000000000000000000", // <-- DUMMY
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0x0000000000000000000000000000000000000000",
    "deposit_and_stake": "0x0000000000000000000000000000000000000000",
    "stable_calc": "0xCA8d0747B5573D69653C3aC22242e6341C36e4b4", // <-- CHANGED
    "crypto_calc": '0xA72C85C258A81761433B4e8da60505Fe3Dd551CC', // <--- NEW
    "factory": '0x5277A0226d10392295E8D383E9724D6E416d6e6C',
    "crvusd_factory": '0x4F8846Ae9380B90d2E71D5e3D042dff3E7ebb40d', // <-- DUMMY
    "eywa_factory": '0x37F22A0B028f2152e6CAcef210e0C4d3b875f367', // <--- DUMMY
    "crypto_factory": '0xF18056Bbd320E96A48e3Fbf8bC061322531aac99', // <--- TODO CHANGE
    "twocrypto_factory": '0x98EE851a00abeE0d95D08cF4CA2BdCE32aeaAF7F', // <--- NEW
    "tricrypto_factory": '0x0c0e5f2fF0ff18a3be9b835635039256dC4B4963', // <--- TODO CHANGE
    "stable_ng_factory": '0x1764ee18e8B3ccA4787249Ceb249356192594585', // <--- NEW
    "factory_admin": "",
});

export const ALIASES_ZKSYNC = lowerCaseValues({
    "crv": "0x5945932099f124194452a4c62d34bB37f16183B2",
    "child_gauge_factory": "0x167D9C27070Ce04b79820E6aaC0cF243d6098812",
    "voting_escrow": "0x0000000000000000000000000000000000000000",
    "fee_distributor": "0x0000000000000000000000000000000000000000",
    "gauge_controller": "0x0000000000000000000000000000000000000000",
    "address_provider": "0x0000000000000000000000000000000000000000",
    "router": "0x7C915390e109CA66934f1eB285854375D1B127FA",
    "deposit_and_stake": "0x253548e98C769aD2850da8DB3E4c2b2cE46E3839",
    "stable_calc": "0x0000000000000000000000000000000000000000",
    "crypto_calc": '0x0000000000000000000000000000000000000000',
    "factory": '0x0000000000000000000000000000000000000000',
    "crvusd_factory": '0x0000000000000000000000000000000000000000',
    "eywa_factory": '0x0000000000000000000000000000000000000000',
    "crypto_factory": '0x0000000000000000000000000000000000000000',
    "twocrypto_factory": '0xf3a546AF64aFd6BB8292746BA66DB33aFAE72114',
    "tricrypto_factory": '0x5d4174C40f1246dABe49693845442927d5929f0D',
    "stable_ng_factory": '0xFcAb5d04e8e031334D5e8D2C166B08daB0BE6CaE',
    "factory_admin": "0x0000000000000000000000000000000000000000",
});

export const ALIASES_BASE = lowerCaseValues({
    "crv": "0x8Ee73c484A26e0A5df2Ee2a4960B789967dd0415", // <--- TODO CHANGE
    "child_gauge_factory": "0xe35A879E5EfB4F1Bb7F70dCF3250f2e19f096bd8",
    "child_gauge_factory_old": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    "voting_escrow": "0x0000000000000000000000000000000000000000", // <-- DUMMY
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB", // <--- TODO CHANGE
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383", // <--- TODO CHANGE
    "router": "0x4f37A9d177470499A2dD084621020b023fcffc1F",
    "deposit_and_stake": "0x69522fb5337663d3B4dFB0030b881c1A750Adb4f",
    "stable_calc": "0x5552b631e2aD801fAa129Aacf4B701071cC9D1f7",
    "crypto_calc": '0xEfadDdE5B43917CcC738AdE6962295A0B343f7CE',
    "factory": '0x3093f9B57A428F3EB6285a589cb35bEA6e78c336',
    "crvusd_factory": '0x4F8846Ae9380B90d2E71D5e3D042dff3E7ebb40d', // <-- DUMMY
    "eywa_factory": '0x37F22A0B028f2152e6CAcef210e0C4d3b875f367', // <--- DUMMY
    "crypto_factory": '0x5EF72230578b3e399E6C6F4F6360edF95e83BBfd',
    "twocrypto_factory": '0xc9Fe0C63Af9A39402e8a5514f9c43Af0322b665F', // <--- NEW
    "tricrypto_factory": '0xA5961898870943c68037F6848d2D866Ed2016bcB',
    "factory_admin": "0x0000000000000000000000000000000000000000",
    "stable_ng_factory": '0xd2002373543Ce3527023C75e7518C274A51ce712',
    "gas_oracle": '0xc0d3C0d3C0d3c0D3C0D3C0d3C0d3C0D3C0D3000f',
    "gas_oracle_blob": '0x420000000000000000000000000000000000000f',
});

export const ALIASES_BSC = lowerCaseValues({
    "crv": "0x8Ee73c484A26e0A5df2Ee2a4960B789967dd0415", // <--- TODO CHANGE
    "child_gauge_factory": "0xe35A879E5EfB4F1Bb7F70dCF3250f2e19f096bd8",
    "child_gauge_factory_old": "0xDb205f215f568ADf21b9573b62566f6d9a40bed6",
    "voting_escrow": "0x0000000000000000000000000000000000000000", // <-- TODO CHANGE
    "fee_distributor": "0x0000000000000000000000000000000000000000", // <-- TODO CHANGE
    "gauge_controller": "0x0000000000000000000000000000000000000000", // <--- TODO CHANGE
    "address_provider": "0x0000000000000000000000000000000000000000", // <--- TODO CHANGE
    "router": "0xA72C85C258A81761433B4e8da60505Fe3Dd551CC",
    "deposit_and_stake": "0x4f37A9d177470499A2dD084621020b023fcffc1F",
    "stable_calc": "0x0fE38dCC905eC14F6099a83Ac5C93BF2601300CF",
    "crypto_calc": '0xd6681e74eEA20d196c15038C580f721EF2aB6320',
    "factory": '0xEfDE221f306152971D8e9f181bFe998447975810',
    "crvusd_factory": '0x0000000000000000000000000000000000000000',
    "eywa_factory": '0x0000000000000000000000000000000000000000',
    "crypto_factory": '0xBd5fBd2FA58cB15228a9Abdac9ec994f79E3483C',
    "twocrypto_factory": '0x98EE851a00abeE0d95D08cF4CA2BdCE32aeaAF7F', // <--- NEW
    "tricrypto_factory": '0xc55837710bc500F1E3c7bb9dd1d51F7c5647E657',
    "stable_ng_factory": '0xd7E72f3615aa65b92A4DBdC211E296a35512988B',
    "factory_admin": '0x0000000000000000000000000000000000000000',
});

export const ALIASES_FRAXTAL = lowerCaseValues({
    "crv": "0x331B9182088e2A7d6D3Fe4742AbA1fB231aEcc56",
    "child_gauge_factory": "0x0B8D6B6CeFC7Aa1C2852442e518443B1b22e1C52",
    "child_gauge_factory_old": "0xeF672bD94913CB6f1d2812a6e18c1fFdEd8eFf5c",
    "voting_escrow": "0x0000000000000000000000000000000000000000",
    "fee_distributor": "0x0000000000000000000000000000000000000000",
    "gauge_controller": "0x0000000000000000000000000000000000000000",
    "address_provider": "0x0000000000000000000000000000000000000000",
    "router": "0x9f2Fa7709B30c75047980a0d70A106728f0Ef2db",
    "deposit_and_stake": "0x0fE38dCC905eC14F6099a83Ac5C93BF2601300CF",
    "stable_calc": "0xCA8d0747B5573D69653C3aC22242e6341C36e4b4",
    "crypto_calc": '0x69522fb5337663d3B4dFB0030b881c1A750Adb4f',
    "factory": '0x0000000000000000000000000000000000000000', //TODO CHANGE
    "crvusd_factory": '0x0000000000000000000000000000000000000000', //TODO CHANGE
    "eywa_factory": '0x0000000000000000000000000000000000000000', //TODO CHANGE
    "crypto_factory": '0x0000000000000000000000000000000000000000', //TODO CHANGE
    "twocrypto_factory": '0x98EE851a00abeE0d95D08cF4CA2BdCE32aeaAF7F',
    "tricrypto_factory": '0xc9Fe0C63Af9A39402e8a5514f9c43Af0322b665F',
    "stable_ng_factory": '0xd2002373543Ce3527023C75e7518C274A51ce712',
    "factory_admin": '0x0000000000000000000000000000000000000000',
});

export const ALIASES_XLAYER = lowerCaseValues({
    "crv": "0x0000000000000000000000000000000000000000",
    "child_gauge_factory": "0xD5C3e070E121488806AaA5565283A164ACEB94Df",
    "child_gauge_factory_old": "0xeF672bD94913CB6f1d2812a6e18c1fFdEd8eFf5c",
    "voting_escrow": "0x0000000000000000000000000000000000000000",
    "fee_distributor": "0x0000000000000000000000000000000000000000",
    "gauge_controller": "0x0000000000000000000000000000000000000000",
    "address_provider": "0x0000000000000000000000000000000000000000",
    "router": "0xBFab8ebc836E1c4D81837798FC076D219C9a1855",
    "deposit_and_stake": "0x5552b631e2aD801fAa129Aacf4B701071cC9D1f7",
    "stable_calc": "0x0fE38dCC905eC14F6099a83Ac5C93BF2601300CF",
    "crypto_calc": '0x69522fb5337663d3B4dFB0030b881c1A750Adb4f',
    "factory": '0x0000000000000000000000000000000000000000',
    "crvusd_factory": '0x0000000000000000000000000000000000000000',
    "eywa_factory": '0x0000000000000000000000000000000000000000',
    "crypto_factory": '0x0000000000000000000000000000000000000000',
    "twocrypto_factory": '0x0c59d36b23f809f8b6C7cb4c8C590a0AC103baEf',
    "tricrypto_factory": '0xd3B17f862956464ae4403cCF829CE69199856e1e',
    "stable_ng_factory": '0x5eeE3091f747E60a045a2E715a4c71e600e31F6E',
    "factory_admin": '0x0000000000000000000000000000000000000000',
});

export const ALIASES_MANTLE = lowerCaseValues({
    "crv": "0x0000000000000000000000000000000000000000",
    "child_gauge_factory": "0x0B8D6B6CeFC7Aa1C2852442e518443B1b22e1C52",
    "child_gauge_factory_old": "0xeF672bD94913CB6f1d2812a6e18c1fFdEd8eFf5c",
    "voting_escrow": "0x0000000000000000000000000000000000000000",
    "fee_distributor": "0x0000000000000000000000000000000000000000",
    "gauge_controller": "0x0000000000000000000000000000000000000000",
    "address_provider": "0x0000000000000000000000000000000000000000",
    "router": "0x4f37A9d177470499A2dD084621020b023fcffc1F",
    "deposit_and_stake": "0x5552b631e2ad801faa129aacf4b701071cc9d1f7",
    "stable_calc": "0x0fE38dCC905eC14F6099a83Ac5C93BF2601300CF",
    "crypto_calc": '0xd6681e74eEA20d196c15038C580f721EF2aB6320',
    "factory": '0x0000000000000000000000000000000000000000',
    "crvusd_factory": '0x0000000000000000000000000000000000000000',
    "eywa_factory": '0x0000000000000000000000000000000000000000',
    "crypto_factory": '0x0000000000000000000000000000000000000000',
    "twocrypto_factory": '0x98EE851a00abeE0d95D08cF4CA2BdCE32aeaAF7F',
    "tricrypto_factory": '0x0C9D8c7e486e822C29488Ff51BFf0167B4650953',
    "stable_ng_factory": '0x5eeE3091f747E60a045a2E715a4c71e600e31F6E',
    "factory_admin": '0x0000000000000000000000000000000000000000',
});


const registry_exchange_deprecated = {
    '1': '0x99a58482bd75cbab83b27ec03ca68ff489b5788f',
    '10': '0x22d710931f01c1681ca1570ff016ed42eb7b7c2a',
    '100': '0xe6358f6a45b502477e83cc1cda759f540e4459ee',
    '137': '0x2a426b3bb4fa87488387545f15d01d81352732f9',
    '250': '0xfd8c73d35e522648312a43e7ceb85fe12c8c1760',
    '324': '0x0000000000000000000000000000000000000000',
    '1284': '0x6600e98b71dabfD4A8Cac03b302B0189Adb86Afb',
    '2222': '0xcbf451d41f2ba5b0d169740fd01293dcaf9becb9',
    '8453': '0x0000000000000000000000000000000000000000',
    '42161': '0x4c2af2df2a7e567b5155879720619ea06c5bb15d',
    '42220': '0x0000000000000000000000000000000000000000',
    '43114': '0xbff334f8d5912ac5c4f2c590a2396d1c5d990123',
    '1313161554': '0x6600e98b71dabfd4a8cac03b302b0189adb86afb',
}

const router_deprecated = "0xfA9a30350048B2BF66865ee20363067c66f67e58";
