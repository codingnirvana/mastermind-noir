// TODO use the JSON directly for now
// import { compile } from '@noir-lang/noir_wasm';
import { decompressSync } from 'fflate';
import {
  BarretenbergApiAsync,
  Crs,
  newBarretenbergApiAsync,
  RawBuffer,
} from '@aztec/bb.js/dest/node/index.js';
import { executeCircuit, compressWitness } from '@noir-lang/acvm_js/nodejs/acvm_js';
import { ethers } from 'ethers'; // I'm lazy so I'm using ethers to pad my input
import { Ptr, Fr } from '@aztec/bb.js/dest/node/types/index.js';


export class NoirNode {
  acir: string = '';
  acirBuffer: Uint8Array = Uint8Array.from([]);
  acirBufferUncompressed: Uint8Array = Uint8Array.from([]);

  api = {} as BarretenbergApiAsync;
  acirComposer = {} as Ptr;

  async init(circuit: any) {
    this.acirBuffer = Buffer.from(circuit.bytecode, 'base64');
    this.acirBufferUncompressed = decompressSync(this.acirBuffer);
    

    this.api = await newBarretenbergApiAsync(4);
   

    const [exact, total, subgroup] = await this.api.acirGetCircuitSizes(
      this.acirBufferUncompressed,
    );

    const subgroupSize = Math.pow(2, Math.ceil(Math.log2(total)));
    const crs = await Crs.new(subgroupSize + 1);
    await this.api.commonInitSlabAllocator(subgroupSize);
    await this.api.srsInitSrs(
      new RawBuffer(crs.getG1Data()),
      crs.numPoints,
      new RawBuffer(crs.getG2Data()),
    );

    this.acirComposer = await this.api.acirNewAcirComposer(subgroupSize);
    
  }

  async generateWitness(input: any): Promise<Uint8Array> {
    const initialWitness = new Map<number, string>();    
    Object.keys(input).map((key, i) => initialWitness.set(i + 1, input[key]));

    console.log(initialWitness);

    const witnessMap = await executeCircuit(this.acirBuffer, initialWitness, () => {
      throw Error('unexpected oracle');
    });

    const witnessBuff = compressWitness(witnessMap);
    return witnessBuff;
  }

  async generateProof(witness: Uint8Array) {
    const proof = await this.api.acirCreateProof(
      this.acirComposer,
      this.acirBufferUncompressed,
      decompressSync(witness),
      false,
    );
    return proof;
  }

  async verifyProof(proof: Uint8Array) {
    await this.api.acirInitProvingKey(this.acirComposer, this.acirBufferUncompressed);
    const verified = await this.api.acirVerifyProof(this.acirComposer, proof, false);
    return verified;
  }

  async compressInputs(values: number[]) {
    let serialised_inputs = []
    for (var i = 0; i < values.length; i++) {
        let number_hex = values[i].toString(16);
        let padded_number_hex = number_hex.length %2 == 0 ? "0x" + number_hex : "0x0" + number_hex; // TOOD: this logic should be placed inside the `serialise_public_inputs` method
        serialised_inputs.push(
            Fr.fromString(padded_number_hex)
        );
    }
    const compressed_inputs = await this.api.pedersenHashMultiple(serialised_inputs);
    return compressed_inputs;
  }

  async destroy() {
    await this.api.destroy();
  }
}