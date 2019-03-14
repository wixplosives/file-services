import { expect } from 'chai';
import { nodeFs } from '@file-services/node';
import { createCjsModuleSystem } from '../src';

describe('commonjs module system - integration with existing npm packages', () => {
    it('evaluates react/react-dom successfully', () => {
        const ms = createCjsModuleSystem({ fs: nodeFs });
        const { requireFrom } = ms;

        const React = requireFrom(__dirname, 'react') as typeof import('react');
        const ReactDOM = requireFrom(__dirname, 'react-dom') as typeof import('react-dom');

        expect(React.createElement).to.be.instanceOf(Function);
        expect(React.Component).to.be.instanceOf(Function);
        expect(ReactDOM.render).to.be.instanceOf(Function);
    });

    it('evaluates chai successfully', () => {
        const ms = createCjsModuleSystem({ fs: nodeFs });
        const { requireFrom } = ms;

        const chai = requireFrom(__dirname, 'chai') as typeof import('chai');

        expect(chai.expect).to.be.instanceOf(Function);
        expect(chai.use).to.be.instanceOf(Function);
    });

    // skipped until we resolver support "browser": {}
    it.skip('evaluates mocha successfully', () => {
        const ms = createCjsModuleSystem({ fs: nodeFs });
        const { requireFrom } = ms;

        const mocha = requireFrom(__dirname, 'mocha') as typeof import('mocha');

        expect(mocha.setup).to.be.instanceOf(Function);
        expect(mocha.run).to.be.instanceOf(Function);
    });
});
