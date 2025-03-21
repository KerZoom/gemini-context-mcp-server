import { Logger } from '../utils/logger.js';
import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { config } from '../config.js';
import { Writable } from 'stream';

describe('Logger', () => {
    let mockStream: Writable;
    let originalDebugLogging: boolean;
    let writeSpy: jest.Mock;

    beforeEach(() => {
        originalDebugLogging = config.server.enableDebugLogging;
        config.server.enableDebugLogging = true;
        
        mockStream = new Writable({
            write(chunk, encoding, callback) {
                callback();
            }
        });
        writeSpy = jest.spyOn(mockStream, 'write') as jest.Mock;
        Logger.setOutputStream(mockStream);
    });

    afterEach(() => {
        config.server.enableDebugLogging = originalDebugLogging;
        Logger.setOutputStream(process.stdout);
        jest.restoreAllMocks();
    });

    it('should format messages with level', () => {
        const message = 'Test message';
        Logger.info(message);
        expect(writeSpy).toHaveBeenCalledWith('[INFO] Test message \n');
    });

    it('should handle additional arguments', () => {
        const message = 'Test message';
        const arg1 = { key: 'value' };
        const arg2 = [1, 2, 3];
        Logger.info(message, arg1, arg2);
        expect(writeSpy).toHaveBeenCalledWith(`[INFO] Test message [object Object] 1,2,3\n`);
    });

    it('should log warning messages', () => {
        const message = 'Warning message';
        Logger.warn(message);
        expect(writeSpy).toHaveBeenCalledWith('[WARN] Warning message \n');
    });

    it('should log error messages', () => {
        const message = 'Error message';
        Logger.error(message);
        expect(writeSpy).toHaveBeenCalledWith('[ERROR] Error message \n');
    });

    it('should log debug messages when enabled', () => {
        const message = 'Debug message';
        Logger.debug(message);
        expect(writeSpy).toHaveBeenCalledWith('[DEBUG] Debug message \n');
    });

    it('should not log debug messages when disabled', () => {
        config.server.enableDebugLogging = false;
        const message = 'Debug message';
        Logger.debug(message);
        expect(writeSpy).not.toHaveBeenCalled();
    });

    it('should handle stream changes', () => {
        const newMockStream = new Writable({
            write(chunk, encoding, callback) {
                callback();
            }
        });
        const newWriteSpy = jest.spyOn(newMockStream, 'write') as jest.Mock;
        
        Logger.setOutputStream(newMockStream);
        Logger.info('Test');
        
        expect(writeSpy).not.toHaveBeenCalled();
        expect(newWriteSpy).toHaveBeenCalledWith('[INFO] Test \n');
    });
}); 