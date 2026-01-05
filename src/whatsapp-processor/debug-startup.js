"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const whatsapp_service_1 = require("./src/services/whatsapp.service");
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const db_client_1 = require("./src/clients/db.client");
const db_init_1 = require("./src/utils/db-init");
function testStart() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('--- Initializing DBs ---');
            yield (0, db_client_1.initializeDeepLensDbClient)();
            yield (0, db_client_1.initializeWhatsAppDbClient)();
            yield (0, db_init_1.initializeDatabaseSchema)();
            console.log('--- Creating Service ---');
            const app = (0, express_1.default)();
            const server = http_1.default.createServer(app);
            const io = new socket_io_1.Server(server);
            const waService = new whatsapp_service_1.WhatsAppService(io);
            console.log('--- Starting WA Service ---');
            yield waService.start();
            console.log('--- Started Successfully ---');
        }
        catch (err) {
            console.error('--- STARTUP ERROR ---');
            console.error(err);
            process.exit(1);
        }
    });
}
testStart();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWctc3RhcnR1cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRlYnVnLXN0YXJ0dXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzRUFBa0U7QUFDbEUseUNBQW1EO0FBQ25ELGdEQUF3QjtBQUN4QixzREFBOEI7QUFDOUIsdURBQWlHO0FBQ2pHLGlEQUErRDtBQUUvRCxTQUFlLFNBQVM7O1FBQ3BCLElBQUksQ0FBQztZQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztZQUN4QyxNQUFNLElBQUEsc0NBQTBCLEdBQUUsQ0FBQztZQUNuQyxNQUFNLElBQUEsc0NBQTBCLEdBQUUsQ0FBQztZQUNuQyxNQUFNLElBQUEsa0NBQXdCLEdBQUUsQ0FBQztZQUVqQyxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUM7WUFDeEMsTUFBTSxHQUFHLEdBQUcsSUFBQSxpQkFBTyxHQUFFLENBQUM7WUFDdEIsTUFBTSxNQUFNLEdBQUcsY0FBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN0QyxNQUFNLEVBQUUsR0FBRyxJQUFJLGtCQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxrQ0FBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRTFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsQ0FBQztZQUMzQyxNQUFNLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN4QixPQUFPLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFDaEQsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDWCxPQUFPLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUM7WUFDdkMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLENBQUM7SUFDTCxDQUFDO0NBQUE7QUFFRCxTQUFTLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFdoYXRzQXBwU2VydmljZSB9IGZyb20gJy4vc3JjL3NlcnZpY2VzL3doYXRzYXBwLnNlcnZpY2UnO1xyXG5pbXBvcnQgeyBTZXJ2ZXIgYXMgU29ja2V0U2VydmVyIH0gZnJvbSAnc29ja2V0LmlvJztcclxuaW1wb3J0IGh0dHAgZnJvbSAnaHR0cCc7XHJcbmltcG9ydCBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xyXG5pbXBvcnQgeyBpbml0aWFsaXplRGVlcExlbnNEYkNsaWVudCwgaW5pdGlhbGl6ZVdoYXRzQXBwRGJDbGllbnQgfSBmcm9tICcuL3NyYy9jbGllbnRzL2RiLmNsaWVudCc7XHJcbmltcG9ydCB7IGluaXRpYWxpemVEYXRhYmFzZVNjaGVtYSB9IGZyb20gJy4vc3JjL3V0aWxzL2RiLWluaXQnO1xyXG5cclxuYXN5bmMgZnVuY3Rpb24gdGVzdFN0YXJ0KCkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBjb25zb2xlLmxvZygnLS0tIEluaXRpYWxpemluZyBEQnMgLS0tJyk7XHJcbiAgICAgICAgYXdhaXQgaW5pdGlhbGl6ZURlZXBMZW5zRGJDbGllbnQoKTtcclxuICAgICAgICBhd2FpdCBpbml0aWFsaXplV2hhdHNBcHBEYkNsaWVudCgpO1xyXG4gICAgICAgIGF3YWl0IGluaXRpYWxpemVEYXRhYmFzZVNjaGVtYSgpO1xyXG5cclxuICAgICAgICBjb25zb2xlLmxvZygnLS0tIENyZWF0aW5nIFNlcnZpY2UgLS0tJyk7XHJcbiAgICAgICAgY29uc3QgYXBwID0gZXhwcmVzcygpO1xyXG4gICAgICAgIGNvbnN0IHNlcnZlciA9IGh0dHAuY3JlYXRlU2VydmVyKGFwcCk7XHJcbiAgICAgICAgY29uc3QgaW8gPSBuZXcgU29ja2V0U2VydmVyKHNlcnZlcik7XHJcbiAgICAgICAgY29uc3Qgd2FTZXJ2aWNlID0gbmV3IFdoYXRzQXBwU2VydmljZShpbyk7XHJcblxyXG4gICAgICAgIGNvbnNvbGUubG9nKCctLS0gU3RhcnRpbmcgV0EgU2VydmljZSAtLS0nKTtcclxuICAgICAgICBhd2FpdCB3YVNlcnZpY2Uuc3RhcnQoKTtcclxuICAgICAgICBjb25zb2xlLmxvZygnLS0tIFN0YXJ0ZWQgU3VjY2Vzc2Z1bGx5IC0tLScpO1xyXG4gICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignLS0tIFNUQVJUVVAgRVJST1IgLS0tJyk7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xyXG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcclxuICAgIH1cclxufVxyXG5cclxudGVzdFN0YXJ0KCk7XHJcbiJdfQ==