import { lowerCaseValues } from "./utils";


export const ALIASES_ETHEREUM = lowerCaseValues({
    "crv": "0xD533a949740bb3306d119CC777fa900bA034cd52", // <--- CHANGE
    "minter": "0xd061D61a4d941c39E5453435B6345Dc261C2fcE0", // <--- CHANGE
    "voting_escrow": "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2",
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc",
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0xfA9a30350048B2BF66865ee20363067c66f67e58",
    "deposit_and_stake": "0x271fbE8aB7f1fB262f81C77Ea5303F03DA9d3d6A", // <--- CHANGE
    "factory": '0xb9fc157394af804a3578134a6585c0dc9cc990d4', // <--- CHANGE
    "crypto_factory": '0xF18056Bbd320E96A48e3Fbf8bC061322531aac99', // <--- CHANGE
    "registry_exchange": "",
});

export const ALIASES_POLYGON = lowerCaseValues({
    "crv": "0x172370d5cd63279efa6d502dab29171933a610af",
    "minter": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    "voting_escrow": "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2", // <-- DUMMY
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0xfA9a30350048B2BF66865ee20363067c66f67e58",
    "deposit_and_stake": "0x43FF7b96808988C9d19C1d05Ef19658B03e8a143",
    "factory": '0x722272d36ef0da72ff51c5a65db7b870e2e8d4ee',
    "crypto_factory": "0xE5De15A9C9bBedb4F5EC13B131E61245f2983A69",
    "registry_exchange": "",
});

export const ALIASES_FANTOM = lowerCaseValues({
    "crv": "0x1E4F97b9f9F913c46F1632781732927B9019C68b",
    "minter": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    "voting_escrow": "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2", // <-- DUMMY
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0xfA9a30350048B2BF66865ee20363067c66f67e58",
    "deposit_and_stake": "0xB7De33440B7171159a9718CBE748086cecDd9685",
    "factory": "0x686d67265703d1f124c45e33d47d794c566889ba",
    "crypto_factory": "0xE5De15A9C9bBedb4F5EC13B131E61245f2983A69",
    "registry_exchange": "",
});

export const ALIASES_AVALANCHE = lowerCaseValues({
    "crv": "0x47536F17F4fF30e64A96a7555826b8f9e66ec468",
    "minter": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    "voting_escrow": "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2", // <-- DUMMY
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0xfA9a30350048B2BF66865ee20363067c66f67e58",
    "deposit_and_stake": "0xB7De33440B7171159a9718CBE748086cecDd9685",
    "factory": '0xb17b674D9c5CB2e441F8e196a2f048A81355d031',
    "crypto_factory": '0xF18056Bbd320E96A48e3Fbf8bC061322531aac99', // <--- TODO CHANGE
    "registry_exchange": "",
});

export const ALIASES_ARBITRUM = lowerCaseValues({
    "crv": "0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978",
    "minter": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    "voting_escrow": "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2", // <-- DUMMY
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0xfA9a30350048B2BF66865ee20363067c66f67e58",
    "deposit_and_stake": "0xB7De33440B7171159a9718CBE748086cecDd9685",
    "factory": '0xb17b674D9c5CB2e441F8e196a2f048A81355d031',
    "crypto_factory": '0xF18056Bbd320E96A48e3Fbf8bC061322531aac99', // <--- TODO CHANGE
    "registry_exchange": "",
});

export const ALIASES_OPTIMISM = lowerCaseValues({
    "crv": "0x0994206dfE8De6Ec6920FF4D779B0d950605Fb53",
    "minter": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    "voting_escrow": "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2", // <-- DUMMY
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0xfA9a30350048B2BF66865ee20363067c66f67e58",
    "deposit_and_stake": "0xB7De33440B7171159a9718CBE748086cecDd9685",
    "factory": '0x2db0E83599a91b508Ac268a6197b8B14F5e72840',
    "crypto_factory": '0xF18056Bbd320E96A48e3Fbf8bC061322531aac99', // <--- TODO CHANGE
    "registry_exchange": "",
});

export const ALIASES_XDAI = lowerCaseValues({
    "crv": "0x712b3d230f3c1c19db860d80619288b1f0bdd0bd",
    "minter": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    "voting_escrow": "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2", // <-- DUMMY
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0xfA9a30350048B2BF66865ee20363067c66f67e58",
    "deposit_and_stake": "0xB7De33440B7171159a9718CBE748086cecDd9685",
    "factory": '0xD19Baeadc667Cf2015e395f2B08668Ef120f41F5',
    "crypto_factory": '0xF18056Bbd320E96A48e3Fbf8bC061322531aac99', // <--- TODO CHANGE
    "registry_exchange": "",
});

export const ALIASES_MOONBEAM = lowerCaseValues({
    "crv": "0x7C598c96D02398d89FbCb9d41Eab3DF0C16F227D",
    "minter": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    "voting_escrow": "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2", // <-- DUMMY
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0xfA9a30350048B2BF66865ee20363067c66f67e58",
    "deposit_and_stake": "0xB7De33440B7171159a9718CBE748086cecDd9685",
    "factory": '0x4244eB811D6e0Ef302326675207A95113dB4E1F8',
    "crypto_factory": '0xF18056Bbd320E96A48e3Fbf8bC061322531aac99', // <--- TODO CHANGE
    "registry_exchange": "",
});

export const ALIASES_AURORA = lowerCaseValues({
    "crv": "0x64D5BaF5ac030e2b7c435aDD967f787ae94D0205",
    "minter": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    "voting_escrow": "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2", // <-- DUMMY
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0xfA9a30350048B2BF66865ee20363067c66f67e58",
    "deposit_and_stake": "0xB7De33440B7171159a9718CBE748086cecDd9685",
    "factory": '0xb9fc157394af804a3578134a6585c0dc9cc990d4', // <--- TODO CHANGE
    "crypto_factory": '0xF18056Bbd320E96A48e3Fbf8bC061322531aac99', // <--- TODO CHANGE
    "registry_exchange": "",
});

export const ALIASES_KAVA = lowerCaseValues({
    "crv": "0x64D5BaF5ac030e2b7c435aDD967f787ae94D0205", // <--- TODO CHANGE
    "minter": "0xabC000d88f23Bb45525E447528DBF656A9D55bf5",
    "voting_escrow": "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2", // <-- DUMMY
    "fee_distributor": "0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc", // <-- DUMMY
    "gauge_controller": "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    "address_provider": "0x0000000022d53366457f9d5e68ec105046fc4383",
    "router": "0xfA9a30350048B2BF66865ee20363067c66f67e58",
    "deposit_and_stake": "0xB7De33440B7171159a9718CBE748086cecDd9685",
    "factory": '0x40bc62805471eF53DdD5C5cF99ed3d9e5aa81b48',
    "crypto_factory": '0xF18056Bbd320E96A48e3Fbf8bC061322531aac99', // <--- TODO CHANGE
    "registry_exchange": "",
});
