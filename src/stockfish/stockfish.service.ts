import { Injectable } from '@nestjs/common';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as path from 'path';

@Injectable()
export class StockfishService {
  private engine: ChildProcessWithoutNullStreams;

  constructor() {
    this.startEngine();
  }

  private startEngine() {
    const stockfishPath = process.platform === 'win32'
      ? path.resolve(__dirname, '../stockfish/stockfish-windows-x86-64-avx2.exe')
      : path.resolve(__dirname, '../stockfish/stockfish-ubuntu-x86-64-avx2');
    console.log(`Stockfish binary path: ${stockfishPath}`);

    this.engine = spawn(stockfishPath);

    this.engine.stdout.on('data', (data) => {
      // console.log(`Stockfish message: ${data.toString()}`);
    });

    this.engine.stderr.on('data', (data) => {
      console.error(`Stockfish error: ${data.toString()}`);
    });

    this.engine.on('exit', (code) => {
      console.log(`Stockfish exited with code ${code}`);
    });

    this.engine.on('error', (error) => {
      console.error('Failed to start Stockfish:', error);
    });

    this.engine.on('exit', (code) => {
      console.log(`Stockfish exited with code ${code}`);
    });
  }

  public async getBestMove(fen: string): Promise<{ from: string; to: string; }> {
    return new Promise((resolve, reject) => {
      this.engine.stdin.write(`position fen ${fen}\n`);
      this.engine.stdin.write('go depth 20\n');

      const onMessage = (data: Buffer) => {
        const message = data.toString().trim();;
        // console.log(`Received message from Stockfish: ${message}`);

        if (message.includes('bestmove')) {
          const parts = message.split(' ');
          const bestMoveIndex = parts.findIndex(part => part.includes('bestmove')) + 1;
          const bestMove = parts[bestMoveIndex];

          if (bestMove && bestMove.length === 4) {
            const from = bestMove.slice(0, 2);
            const to = bestMove.slice(2, 4);

            resolve({ from, to });
          } else {
            reject(new Error(`Invalid move format from Stockfish: ${bestMove}`));
          }

          // Disabling the handler after receiving `bestmove`
          this.engine.stdout.off('data', onMessage);
        }
      };

      this.engine.stdout.on('data', onMessage);
    });
  }





}
