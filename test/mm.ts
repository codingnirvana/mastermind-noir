// import { ethers } from "hardhat";
import { expect } from 'chai';
import {describe, it } from 'mocha';
import { ethers } from 'ethers'; 
// import { Contract, ContractFactory, utils } from 'ethers';
import { NoirNode } from '../utils/noir/noirNode.js';
import circuit from '../circuits/target/main.json' assert { type: "json" };


const noir = new NoirNode();


type MMProofInput = {
    guessA: string;
    guessB: string;
    guessC: string;
    guessD: string;
    numHit: string;
    numBlow: string;
    solnHash: string;
    solnA: string;
    solnB: string;
    solnC: string;
    solnD: string;
    salt: string;
}

describe('Mastermind tests using typescript wrapper', function() {
    before(async () => {        
        await noir.init(circuit);
    });

    after(async() => {
        await noir.destroy();
    });

    async function createProofInput(guesses: number[], solution: number[], salt: number) :Promise<MMProofInput> {
        let [hit, blow] = calculateHB(guesses, solution);
        console.log('hit: ', hit, 'blow: ', blow);

        let padded_guesses = guesses.map(g => ethers.utils.hexZeroPad(`0x${g.toString(16)}`, 32))
        let padded_solution = solution.map(s => ethers.utils.hexZeroPad(`0x${s.toString(16)}`, 32));

        let solnHash = (await noir.compressInputs([salt, ...solution])).toString();
        console.log('solnHash: ' + solnHash);

        return {
            guessA: padded_guesses[0],
            guessB: padded_guesses[1],
            guessC: padded_guesses[2],
            guessD: padded_guesses[3],
            numHit: ethers.utils.hexZeroPad(`0x${hit.toString(16)}`, 32),
            numBlow: ethers.utils.hexZeroPad(`0x${blow.toString(16)}`, 32),
            solnHash: solnHash,
            solnA: padded_solution[0],
            solnB: padded_solution[1],
            solnC: padded_solution[2],
            solnD: padded_solution[3],
            salt: ethers.utils.hexZeroPad(`0x${salt.toString(16)}`, 32),
        }
    }                

    it("Code breaker wins, compiled using nargo", async () => {
        let guesses = [1, 2, 3, 4];
        let solution = [1, 2, 3, 4];
        let salt = 50;

        let abi = await createProofInput(guesses, solution, salt);
        console.log('abi' + abi);
        const witness = await noir.generateWitness(abi);
        const proof = await noir.generateProof(witness);
        
        expect(proof instanceof Uint8Array).to.be.true;

        const verified = await noir.verifyProof(proof);
    
        console.log(verified);

        expect(verified).to.be.true;
    });

    it("Code breaker has hits, but without a win", async () => {
        let guesses = [1, 2, 3, 4];
        let solution = [1, 3, 5, 4];
        let salt = 50;

        let abi = createProofInput(guesses, solution, salt);
        
        const witness = await noir.generateWitness(abi);
        const proof = await noir.generateProof(witness);
        
        expect(proof instanceof Uint8Array).to.be.true;

        const verified = await noir.verifyProof(proof);
    
        console.log(verified);

        expect(verified).to.be.true;
    });

    it("Code breaker has no hits, but has a blow", async () => {
        let guesses = [4, 5, 6, 7];
        let solution = [1, 2, 3, 4];
        let salt = 50;
 
        let abi = createProofInput(guesses, solution, salt)
        const witness = await noir.generateWitness(abi);
        const proof = await noir.generateProof(witness);
        
        expect(proof instanceof Uint8Array).to.be.true;

        const verified = await noir.verifyProof(proof);
    
        console.log(verified);

        expect(verified).to.be.true;
    });

});

// describe('Mastermind tests using solidity verifier', function() {
//     let Verifier: ContractFactory;
//     let verifierContract: Contract;

//     let barretenberg: BarretenbergWasm;
//     let pedersen: SinglePedersen;

//     before(async () => {
//         Verifier = await ethers.getContractFactory("TurboVerifier");
//         verifierContract = await Verifier.deploy();

//         barretenberg = await BarretenbergWasm.new();
//         await barretenberg.init()
//         pedersen = new SinglePedersen(barretenberg);
//     });

//     function createProofInput(guesses: number[], solution: number[], salt: number) : MMProofInput {
//         let [hit, blow] = calculateHB(guesses, solution);
//         console.log('hit: ', hit, 'blow: ', blow);

//         let solution_hash_preimage = serialise_inputs([salt, ...solution]);
//         let solnHash = pedersen.compressInputs(solution_hash_preimage);
//         let solnHashString = `0x` + solnHash.toString('hex');
//         console.log('solnHash: ' + solnHashString);

//         return {
//             guessA: guesses[0],
//             guessB: guesses[1],
//             guessC: guesses[2],
//             guessD: guesses[3],
//             numHit: hit,
//             numBlow: blow,
//             solnHash: solnHashString,
//             solnA: solution[0],
//             solnB: solution[1],
//             solnC: solution[2],
//             solnD: solution[3],
//             salt: salt,
//         }
//     }

//     it("Code breaker wins", async () => {
//         let guesses = [1, 2, 3, 4];
//         let solution = [1, 2, 3, 4];
//         let salt = 50;
       
//         let compiled_program = compile(resolve(__dirname, '../circuits/src/main.nr'));
//         const acir = compiled_program.circuit;

//         let [prover, verifier] = await setup_generic_prover_and_verifier(acir);
 
//         let abi = createProofInput(guesses, solution, salt)
//         const proof: Buffer = await create_proof(prover, acir, abi);

//         const verified = await verify_proof(verifier, proof);
//         expect(verified).eq(true)

//         const verified_sol_result = await verifierContract.verify(proof);
//         expect(verified_sol_result).eq(true)
//     });

//     it("Code breaker has hits, but without a win", async () => {
//         let guesses = [1, 2, 3, 4];
//         let solution = [1, 3, 5, 4];
//         let salt = 50;

//         let acirByteArray = path_to_uint8array(resolve(__dirname, '../circuits/build/p.acir'));
//         let acir = acir_from_bytes(acirByteArray);

//         let [prover, verifier] = await setup_generic_prover_and_verifier(acir);
 
//         let abi = createProofInput(guesses, solution, salt)
//         const proof = await create_proof(prover, acir, abi);

//         const verified = await verify_proof(verifier, proof);
//         expect(verified).eq(true);

//         const verified_sol_result = await verifierContract.verify(proof);
//         expect(verified_sol_result).eq(true);
//     });

// });

function calculateHB(guess: number[], solution: number[]) {
    const hit = solution.filter((sol, i) => {
      return sol === guess[i];
    }).length;
  
    const blow = solution.filter((sol, i) => {
      return sol !== guess[i] && guess.some((g) => g === sol);
    }).length;
  
    return [hit, blow];
}
