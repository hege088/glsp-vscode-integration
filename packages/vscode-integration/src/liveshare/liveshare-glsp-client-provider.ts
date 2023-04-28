/********************************************************************************
 * Copyright (c) 2021 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import {
    ActionMessage,
    DisposeClientSessionParameters,
    InitializeClientSessionParameters,
    SubclientInfo
} from '@eclipse-glsp/protocol';
import { LiveShare, Role, Session, SharedService, SharedServiceProxy, getApi } from 'vsls';
import { CollaborateGlspClientProvider, SUBCLIENT_HOST_ID } from '../quickstart-components/collaborate-glsp-client-provider';
import { GlspVscodeServer } from '../types';

export const INITIALIZE_CLIENT_SESSION = 'INITIALIZE_CLIENT_SESSION';
export const DISPOSE_CLIENT_SESSION = 'DISPOSE_CLIENT_SESSION';
export const SEND_ACTION_MESSAGE = 'SEND_ACTION_MESSAGE';
export const ON_ACTION_MESSAGE = 'ON_ACTION_MESSAGE';
export const SERVICE_NAME = 'GLSP-LIVESHARE-SERVICE';

const COLORS = ["#5C2D91", "#FFF100", "#E3008C", "#FF8C00"];

export class LiveshareGlspClientProvider implements CollaborateGlspClientProvider {
    protected session: Session | null;
    protected vsls: LiveShare | null;
    protected role: Role = Role.None;
    protected service: SharedService | SharedServiceProxy | null;
    protected server: GlspVscodeServer;
    protected subclientId: string | null;
    protected subclientInfo: SubclientInfo | null;

    protected get guestService(): SharedServiceProxy {
        return this.service as SharedServiceProxy;
    }

    protected get hostService(): SharedService {
        return this.service as SharedService;
    }

    async initialize(server: GlspVscodeServer): Promise<void> {
        this.server = server;
        this.vsls = await getApi();

        if (this.vsls) {
            this.vsls.onDidChangeSession(async e => {
                this.role = e.session.role;
                this.session = e.session;
                this.subclientId = e.session.role === Role.Host ? SUBCLIENT_HOST_ID : `${this.session!.peerNumber}`;
                const colorId = e.session.role === Role.Host ? 0 : (e.session.peerNumber - 1);
                this.subclientInfo = {
                    subclientId: this.subclientId,
                    name: this.session.user!.emailAddress || this.session.user!.displayName,
                    color: COLORS[colorId] || '#FFFFFF'
                };
                if (e.session.role === Role.Host) {
                    this.service = await this.vsls!.shareService(SERVICE_NAME);
                    if (!this.service) {
                        return;
                    }

                    this.service.onRequest(INITIALIZE_CLIENT_SESSION, async params => {
                        await (await this.server.glspClient).initializeClientSession(params[1] as InitializeClientSessionParameters);
                    });

                    this.service.onRequest(DISPOSE_CLIENT_SESSION, async params => {
                        await (await this.server.glspClient).disposeClientSession(params[1] as DisposeClientSessionParameters);
                    });

                    this.service.onRequest(SEND_ACTION_MESSAGE, async params => {
                        (await this.server.glspClient).sendActionMessage(params[1] as ActionMessage);
                    });
                } else if (e.session.role === Role.Guest) {
                    this.service = await this.vsls!.getSharedService(SERVICE_NAME);
                    if (!this.service) {
                        return;
                    }

                    this.service.onNotify(ON_ACTION_MESSAGE, (message: any) => {
                        const typedMessage = message as ActionMessage;
                        const subclientId = typedMessage.action.subclientId;
                        // check if message is adrseeed to this guest
                        if (this.getSubclientIdFromSession() === subclientId) {
                            this.server.onServerSendEmitter.fire(message);
                        }
                    });
                }
            });
        }
    }

    isInCollaborateMode(): boolean {
        return !!this.service && this.service.isServiceAvailable;
    }

    isHost(): boolean {
        return this.role === Role.Host;
    }

    isGuest(): boolean {
        return this.role === Role.Guest;
    }

    initializeClientSession(params: InitializeClientSessionParameters): Promise<void> {
        return this.guestService.request(INITIALIZE_CLIENT_SESSION, [params]);
    }

    disposeClientSession(params: DisposeClientSessionParameters): Promise<void> {
        return this.guestService.request(DISPOSE_CLIENT_SESSION, [params]);
    }

    sendActionMessage(message: ActionMessage): void {
        this.guestService.request(SEND_ACTION_MESSAGE, [message]);
    }

    handleActionMessage(message: ActionMessage): void {
        this.hostService.notify(ON_ACTION_MESSAGE, message);
    }

    getSubclientIdFromSession(): string {
        return this.subclientId || '';
    }

    getSubclientInfoFromSession(): SubclientInfo {
        return this.subclientInfo || {
            subclientId: '',
            name: '',
            color: ''
        };
    }
}
